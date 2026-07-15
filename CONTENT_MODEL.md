# Approved project record

The production builder accepts structured project records with the following shape:

```json
{
  "slug": "lowercase-kebab-case",
  "title": "Public project title",
  "summary": "A concise public summary.",
  "category": "VISUAL SYSTEM",
  "role": "PUBLIC ROLE DESCRIPTION",
  "year": "2026",
  "status": "draft",
  "approvedForPublic": false,
  "assetLicense": "not-cleared",
  "sections": [
    {
      "heading": "Question",
      "body": "Public case-study copy."
    },
    {
      "heading": "Evidence",
      "body": "Public evidence and outcome copy."
    }
  ]
}
```

The safe default is always `draft`, `approvedForPublic: false`, and `assetLicense: not-cleared`. Changing only one field cannot publish the project.
