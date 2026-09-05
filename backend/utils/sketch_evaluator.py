import base64
from io import BytesIO
from typing import List

from google import genai
from PIL import Image, ImageDraw
from pydantic import ValidationError, BaseModel, Field

from schemas import Point, Path

class SketchEvaluationError(Exception):
    pass

class SketchEvaluationResult(BaseModel):
    score: int = Field(ge=0, le=10)
    comment: str

class SketchEvaluator:
    def __init__(self, model: str, api_key: str, timeout: float) -> None:
        self.default_canvas_width: int = 800
        self.default_canvas_height: int = 600
        
        self.model: str = model
        self.timeout: float = timeout
        self.client: genai.client.AsyncClient = genai.Client(api_key=api_key).aio
        self.prompt: str = """
            You are a fair but strict AI judge in a casual Pictionary game. You have high visual standards.
            The sketcher was supposed to draw the word: '{target_word}'.

            IMPORTANT RULES FOR GRADING:
            1. Base your evaluation ONLY on visual drawings, shapes, sketches, and pictorial illustrations.
            2. Completely ignore any written words, letters, numbers, or text symbols in the image.
            3. If the drawing relies primarily on written text or spelling out the word instead of sketching, give it a score of 0 and remind them that writing is against the rules.
            4. BE STRICT. If the drawing is messy, vague, or barely resembles the target word, give it a low score (1-4). Reserve high scores (8-10) only for sketches that are clearly recognizable.
            
            Respond in strictly valid JSON format with exactly two keys:
            - 'score': An integer ranging from 0 to 10 rating the drawing based on how recognizable the visual illustration is as the target word.
            - 'comment': A friendly, slightly critical, but one-sentence review of their artwork (max 80 characters).
        """

    async def release_resources(self) -> None:
        await self.client.aclose()

    def construct_sketch(self, path_drawing_history: List[Path]) -> Image.Image:
        canvas_width: int = self.default_canvas_width
        canvas_height: int = self.default_canvas_height
        for path in path_drawing_history:
            for endpoint in path.points:
                if endpoint.x > canvas_width: 
                    canvas_width = int(endpoint.x) + 50
                if endpoint.y > canvas_height: 
                    canvas_height = int(endpoint.y) + 50
                    
        canvas: Image.Image = Image.new(mode="RGB", size=(canvas_width, canvas_height), color="white")
        brush: ImageDraw.ImageDraw = ImageDraw.Draw(canvas)
            
        for path in path_drawing_history:
            if len(path.points) == 1:
                point: Point = path.points[0]
                ellipse_radius: float = path.stroke_settings.width / 2.0 
                brush.ellipse(
                    xy=[
                        point.x - ellipse_radius, 
                        point.y - ellipse_radius, 
                        point.x + ellipse_radius, 
                        point.y + ellipse_radius
                    ],
                    fill=path.stroke_settings.color
                )

                continue

            brush.line(
                xy=[(endpoint.x, endpoint.y) for endpoint in path.points],
                fill=path.stroke_settings.color, 
                width=path.stroke_settings.width,
                joint="curve"
            )

        canvas = canvas.resize((int(canvas_width / 2), int(canvas_height / 2)))
        return canvas

    async def evaluate_sketch(self, path_drawing_history: List[Path], target_word: str) -> SketchEvaluationResult:
        if len(path_drawing_history) == 0:
            return SketchEvaluationResult(
                score=0,
                comment="The sketch is empty. Did you forget to draw?"
            )

        canvas: Image.Image = self.construct_sketch(path_drawing_history=path_drawing_history)

        bytes_buffer: BytesIO = BytesIO()
        canvas.save(fp=bytes_buffer, format="JPEG")

        try:
            interaction = await self.client.interactions.create(
                model=self.model,
                input=[
                    {
                        "type": "text",
                        "text": self.prompt.format(target_word=target_word)
                    },
                    {
                        "type": "image",
                        "data": base64.b64encode(bytes_buffer.getvalue()).decode("utf-8"),
                        "mime_type": "image/jpeg"
                    }
                ],
                response_format={
                    "type": "text",
                    "mime_type": "application/json",
                    "schema": SketchEvaluationResult.model_json_schema()
                },
                timeout=self.timeout
            )
        except Exception as e:
            raise SketchEvaluationError(f"AI Judge Error: Unexpected API failure. Details: {str(e)}")
        finally:
            bytes_buffer.close()
        
        try:
            result: SketchEvaluationResult = SketchEvaluationResult.model_validate_json(interaction.output_text)
        except ValidationError:
            raise SketchEvaluationError("Pydantic validation error")
        
        return result