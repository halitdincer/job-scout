from datetime import datetime, timezone

import requests

_EMPLOYMENT_TYPE_MAP = {
    "permanent": "full_time",
    "full-time": "full_time",
    "fulltime": "full_time",
    "full time": "full_time",
    "part-time": "part_time",
    "parttime": "part_time",
    "part time": "part_time",
    "contract": "contract",
    "contractor": "contract",
    "intern": "intern",
    "internship": "intern",
    "temporary": "temporary",
    "temp": "temporary",
}

_WORKPLACE_TYPE_MAP = {
    "onsite": "on_site",
    "on-site": "on_site",
    "on site": "on_site",
    "inoffice": "on_site",
    "remote": "remote",
    "hybrid": "hybrid",
}


def normalize_employment_type(value):
    if not value:
        return "unknown"
    return _EMPLOYMENT_TYPE_MAP.get(value.lower().strip(), "unknown")


def normalize_workplace_type(value):
    if not value:
        return "unknown"
    return _WORKPLACE_TYPE_MAP.get(value.lower().strip(), "unknown")


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
            loc_name = job.get("location", {}).get("name")
            listings.append({
                "external_id": str(job["id"]),
                "title": job["title"],
                "department": departments[0]["name"] if departments else None,
                "locations": [loc_name] if loc_name else [],
                "url": job["absolute_url"],
                "team": None,
                "employment_type": "unknown",
                "workplace_type": "unknown",
                "country": None,
                "published_at": job.get("first_published"),
                "updated_at_source": job.get("updated_at"),
                "is_listed": None,
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
            created_at = posting.get("createdAt")
            published_at = None
            if created_at:
                published_at = datetime.fromtimestamp(
                    created_at / 1000, tz=timezone.utc
                ).isoformat()
            listings.append({
                "external_id": str(posting["id"]),
                "title": posting["text"],
                "department": categories.get("department"),
                "locations": categories.get("allLocations", []),
                "url": posting["hostedUrl"],
                "team": categories.get("team"),
                "employment_type": normalize_employment_type(
                    categories.get("commitment")
                ),
                "workplace_type": normalize_workplace_type(
                    posting.get("workplaceType")
                ),
                "country": posting.get("country"),
                "published_at": published_at,
                "updated_at_source": None,
                "is_listed": None,
            })
        return listings


class AshbyAdapter:
    BASE_URL = "https://api.ashbyhq.com/posting-api/job-board"

    @staticmethod
    def _normalize_locations(primary, secondary):
        locations = []
        if isinstance(primary, str) and primary.strip():
            locations.append(primary.strip())

        for item in secondary or []:
            if isinstance(item, str):
                value = item.strip()
            elif isinstance(item, dict):
                raw = item.get("location")
                value = raw.strip() if isinstance(raw, str) else ""
            else:
                value = ""

            if value:
                locations.append(value)

        return locations

    def fetch_listings(self, board_id):
        response = requests.get(
            f"{self.BASE_URL}/{board_id}",
            timeout=30,
        )
        response.raise_for_status()
        listings = []
        for job in response.json()["jobs"]:
            primary = job.get("location")
            secondary = job.get("secondaryLocations", [])
            locations = self._normalize_locations(primary, secondary)
            address = job.get("address", {})
            postal = address.get("postalAddress", {}) if address else {}
            listings.append({
                "external_id": str(job["id"]),
                "title": job["title"],
                "department": job.get("department"),
                "locations": locations,
                "url": job["jobUrl"],
                "team": job.get("team"),
                "employment_type": normalize_employment_type(
                    job.get("employmentType")
                ),
                "workplace_type": normalize_workplace_type(
                    job.get("workplaceType")
                ),
                "country": postal.get("addressCountry"),
                "published_at": job.get("publishedAt"),
                "updated_at_source": None,
                "is_listed": job.get("isListed"),
            })
        return listings


class WorkdayAdapter:
    PAGE_SIZE = 20

    @staticmethod
    def _parse_board_id(board_id):
        parts = board_id.split(":")
        if len(parts) != 3 or not all(parts):
            raise ValueError(
                f"Invalid Workday board_id {board_id!r}: expected 'tenant:cluster:site'"
            )
        return parts

    def fetch_listings(self, board_id):
        tenant, cluster, site = self._parse_board_id(board_id)
        url = (
            f"https://{tenant}.{cluster}.myworkdayjobs.com"
            f"/wday/cxs/{tenant}/{site}/jobs"
        )
        host = f"https://{tenant}.{cluster}.myworkdayjobs.com"
        listings = []
        offset = 0
        while True:
            response = requests.post(
                url,
                json={
                    "appliedFacets": {},
                    "limit": self.PAGE_SIZE,
                    "offset": offset,
                    "searchText": "",
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            postings = data.get("jobPostings") or []
            if not postings:
                break
            for posting in postings:
                bullet_fields = posting.get("bulletFields") or []
                external_path = posting.get("externalPath") or ""
                if bullet_fields:
                    external_id = str(bullet_fields[0])
                else:
                    external_id = external_path.rsplit("/", 1)[-1]
                locations_text = posting.get("locationsText")
                listings.append({
                    "external_id": external_id,
                    "title": posting.get("title"),
                    "department": None,
                    "locations": [locations_text] if locations_text else [],
                    "url": f"{host}{external_path}",
                    "team": None,
                    "employment_type": normalize_employment_type(
                        posting.get("timeType")
                    ),
                    "workplace_type": "unknown",
                    "country": None,
                    "published_at": None,
                    "updated_at_source": None,
                    "is_listed": None,
                })
            offset += self.PAGE_SIZE
            total = data.get("total") or 0
            if offset >= total:
                break
        return listings


class BambooHRAdapter:
    @staticmethod
    def _workplace_type(is_remote, location_type):
        if is_remote is True:
            return "remote"
        if location_type == "1":
            return "remote"
        if location_type == "2":
            return "on_site"
        if location_type == "3":
            return "hybrid"
        return "unknown"

    @staticmethod
    def _locations(location, ats_location):
        location = location or {}
        ats_location = ats_location or {}
        city = location.get("city")
        state = location.get("state")
        if city and state:
            return [f"{city}, {state}"]
        if city:
            return [city]
        if state:
            return [state]
        ats_city = ats_location.get("city")
        ats_state = ats_location.get("state") or ats_location.get("province")
        ats_country = ats_location.get("country")
        if ats_city and ats_state:
            return [f"{ats_city}, {ats_state}"]
        if ats_city:
            return [ats_city]
        if ats_state:
            return [ats_state]
        if ats_country:
            return [ats_country]
        return []

    def fetch_listings(self, board_id):
        response = requests.get(
            f"https://{board_id}.bamboohr.com/careers/list",
            headers={"Accept": "application/json"},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        listings = []
        for job in data.get("result") or []:
            job_id = str(job["id"])
            listings.append({
                "external_id": job_id,
                "title": job.get("jobOpeningName"),
                "department": job.get("departmentLabel"),
                "locations": self._locations(
                    job.get("location"), job.get("atsLocation")
                ),
                "url": f"https://{board_id}.bamboohr.com/careers/{job_id}",
                "team": None,
                "employment_type": normalize_employment_type(
                    job.get("employmentStatusLabel")
                ),
                "workplace_type": self._workplace_type(
                    job.get("isRemote"), job.get("locationType")
                ),
                "country": None,
                "published_at": None,
                "updated_at_source": None,
                "is_listed": None,
            })
        return listings


_REGISTRY = {
    "greenhouse": GreenhouseAdapter,
    "lever": LeverAdapter,
    "ashby": AshbyAdapter,
    "workday": WorkdayAdapter,
    "bamboohr": BambooHRAdapter,
}


def get_adapter(platform):
    if platform not in _REGISTRY:
        raise ValueError(f"Unknown platform: {platform}")
    return _REGISTRY[platform]()
