import requests


class GreenhouseAdapter:
    BASE_URL = "https://boards-api.greenhouse.io/v1/boards"

    def fetch_listings(self, board_id):
        response = requests.get(
            f"{self.BASE_URL}/{board_id}/jobs",
            params={"content": "true"},
            timeout=30,
        )
        response.raise_for_status()
        listings = []
        for job in response.json()["jobs"]:
            departments = job.get("departments", [])
            listings.append({
                "external_id": str(job["id"]),
                "title": job["title"],
                "department": departments[0]["name"] if departments else None,
                "location": job.get("location", {}).get("name"),
                "url": job["absolute_url"],
            })
        return listings


class LeverAdapter:
    BASE_URL = "https://api.lever.co/v0/postings"

    def fetch_listings(self, board_id):
        response = requests.get(
            f"{self.BASE_URL}/{board_id}",
            params={"mode": "json"},
            timeout=30,
        )
        response.raise_for_status()
        listings = []
        for posting in response.json():
            categories = posting.get("categories", {})
            listings.append({
                "external_id": str(posting["id"]),
                "title": posting["text"],
                "department": categories.get("department"),
                "location": categories.get("location"),
                "url": posting["hostedUrl"],
            })
        return listings


class AshbyAdapter:
    BASE_URL = "https://api.ashbyhq.com/posting-api/job-board"

    def fetch_listings(self, board_id):
        response = requests.get(
            f"{self.BASE_URL}/{board_id}",
            timeout=30,
        )
        response.raise_for_status()
        listings = []
        for job in response.json()["jobs"]:
            listings.append({
                "external_id": str(job["id"]),
                "title": job["title"],
                "department": job.get("department"),
                "location": job.get("location"),
                "url": job["jobUrl"],
            })
        return listings


_REGISTRY = {
    "greenhouse": GreenhouseAdapter,
    "lever": LeverAdapter,
    "ashby": AshbyAdapter,
}


def get_adapter(platform):
    if platform not in _REGISTRY:
        raise ValueError(f"Unknown platform: {platform}")
    return _REGISTRY[platform]()
