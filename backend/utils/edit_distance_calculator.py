from typing import List

def calculate_edit_distance(word1: str, word2: str, n1: int, n2: int, cache: List[List[int]]) -> int:
    if n1 == 0:
        return n2

    if n2 == 0:
        return n1
    
    if cache[n1][n2] != -1:
        return cache[n1][n2]

    if word1[n1 - 1] == word2[n2 - 1]:
        cache[n1][n2] = calculate_edit_distance(word1, word2, n1 - 1, n2 - 1, cache)
        return cache[n1][n2]
    
    insertion_cost: int = 1 + calculate_edit_distance(word1, word2, n1, n2 - 1, cache)
    deletion_cost: int = 1 + calculate_edit_distance(word1, word2, n1 - 1, n2, cache)
    replacement_cost: int = 1 + calculate_edit_distance(word1, word2, n1 - 1, n2 - 1, cache)
    
    cache[n1][n2] = min([
        insertion_cost, deletion_cost, replacement_cost
    ])

    return cache[n1][n2]