AUTH via BASIC AUTH ASxJ6rQrW6WBWzKJdJ1N9IXKLdSBdSd2PONaCJvNK0gPGdofFaCCJQQJ99BDACAAAAAaf2NpAAASAZDO3U1d

GET https://dev.azure.com/GOpus/GOpus%20GmbH/_apis/wit/workitems/80?fields=Custom.ZEPNummer
{
    "id": 80,
    "rev": 13,
    "fields": {
        "Custom.ZEPNummer": "8136, 8403"
    },
    "multilineFieldsFormat": {},
    "_links": {
        "self": {
            "href": "https://dev.azure.com/GOpus/5c0bcda2-6dd6-4fe5-8aac-c23f9ed4baca/_apis/wit/workItems/80"
        },
        "workItemUpdates": {
            "href": "https://dev.azure.com/GOpus/5c0bcda2-6dd6-4fe5-8aac-c23f9ed4baca/_apis/wit/workItems/80/updates"
        },
        "workItemRevisions": {
            "href": "https://dev.azure.com/GOpus/5c0bcda2-6dd6-4fe5-8aac-c23f9ed4baca/_apis/wit/workItems/80/revisions"
        },
        "workItemComments": {
            "href": "https://dev.azure.com/GOpus/5c0bcda2-6dd6-4fe5-8aac-c23f9ed4baca/_apis/wit/workItems/80/comments"
        },
        "html": {
            "href": "https://dev.azure.com/GOpus/5c0bcda2-6dd6-4fe5-8aac-c23f9ed4baca/_workitems/edit/80"
        },
        "workItemType": {
            "href": "https://dev.azure.com/GOpus/5c0bcda2-6dd6-4fe5-8aac-c23f9ed4baca/_apis/wit/workItemTypes"
        },
        "fields": {
            "href": "https://dev.azure.com/GOpus/5c0bcda2-6dd6-4fe5-8aac-c23f9ed4baca/_apis/wit/fields"
        }
    },
    "url": "https://dev.azure.com/GOpus/_apis/wit/workItems/80"
}


PATCH https://dev.azure.com/GOpus/GOpus%20GmbH/_apis/wit/workitems/80?api-version=7.1
Content-Type application/json-patch+json

[
  {
    "op": "add",
    "path": "/fields/Custom.Ist",
    "value": "130"
  }
]


ZEP API Bearer TOken. will provide it later and api too. use placeholders for now if you find any infos on how to get the infos we need implement it 