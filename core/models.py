from django.db import models


class Source(models.Model):
    PLATFORM_CHOICES = [
        ("greenhouse", "Greenhouse"),
        ("lever", "Lever"),
        ("ashby", "Ashby"),
    ]

    name = models.CharField(max_length=255)
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    board_id = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["platform", "board_id"], name="unique_platform_board"
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.platform})"


class LocationTag(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class JobListing(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("expired", "Expired"),
    ]

    EMPLOYMENT_TYPE_CHOICES = [
        ("full_time", "Full-time"),
        ("part_time", "Part-time"),
        ("contract", "Contract"),
        ("intern", "Intern"),
        ("temporary", "Temporary"),
        ("unknown", "Unknown"),
    ]

    WORKPLACE_TYPE_CHOICES = [
        ("on_site", "On-site"),
        ("remote", "Remote"),
        ("hybrid", "Hybrid"),
        ("unknown", "Unknown"),
    ]

    source = models.ForeignKey(Source, on_delete=models.CASCADE, related_name="listings")
    external_id = models.CharField(max_length=255)
    title = models.CharField(max_length=500)
    department = models.CharField(max_length=255, null=True, blank=True)
    locations = models.ManyToManyField(LocationTag, blank=True)
    url = models.URLField(max_length=1000)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    team = models.CharField(max_length=255, null=True, blank=True)
    employment_type = models.CharField(
        max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, null=True, blank=True
    )
    workplace_type = models.CharField(
        max_length=20, choices=WORKPLACE_TYPE_CHOICES, null=True, blank=True
    )
    country = models.CharField(max_length=100, null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    updated_at_source = models.DateTimeField(null=True, blank=True)
    first_seen_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["source", "external_id"], name="unique_source_external_id"
            )
        ]

    def __str__(self):
        return f"{self.title} at {self.source.name}"


class Run(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    sources_processed = models.IntegerField(default=0)
    listings_created = models.IntegerField(default=0)
    listings_updated = models.IntegerField(default=0)
    listings_expired = models.IntegerField(default=0)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Run #{self.id} ({self.status})"
