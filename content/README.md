# content/

Authored sources for posts written outside the (future) admin editor, one folder
per post with its images beside it. Import with

    npm run cli -- post import content/<slug>/index.md            # → in_review
    npm run cli -- post publish <slug>                             # after approval

The database is canonical after import: edits made in the admin later will not
flow back here. Front matter keys: title, subtitle, slug, tags, cover, cover_alt,
seo_description, status.
