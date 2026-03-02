from typing import List


def fetch_naver_reviews(restaurant_name: str) -> List[str]:
    """
    주어진 상호명으로 네이버 검색/지도/리뷰 API를 호출해 리뷰 텍스트 목록을 반환합니다.
    현재는 네트워크 호출을 구현하지 않고, 더미 리뷰 리스트를 반환합니다.
    실제 구현 시에는 네이버 개발자센터의 오픈 API를 사용해야 합니다.
    """
    # TODO: 네이버 검색/지도/리뷰 API 연동
    dummy_reviews = [
        f"{restaurant_name}에 대한 예시 네이버 리뷰입니다. 곱창이 담백하고 분위기가 좋다는 내용.",
        f"{restaurant_name} 방문객이 남긴 또 다른 예시 리뷰입니다. 주차와 대기시간 정보가 포함될 수 있습니다.",
    ]
    return dummy_reviews

