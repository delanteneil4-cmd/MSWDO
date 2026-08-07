# EmailJS approval-email setup

Use the following values in the EmailJS template currently configured as `VITE_EMAILJS_TEMPLATE_ID`.

## Subject

```text
MSWDO application approved — your login credentials
```

## To Email

```text
{{to_email}}
```

## To Name

```text
{{to_name}}
```

## Content

Copy the complete contents of `EMAILJS_APPROVAL_TEMPLATE.html` into the EmailJS template's HTML/content editor, then save and publish the template.

The application supplies these variables:

- `{{to_email}}`
- `{{to_name}}`
- `{{applicant_name}}`
- `{{status}}`
- `{{category}}`
- `{{category_name}}`
- `{{login_email}}`
- `{{temp_password}}`
- `{{login_url}}`
- `{{message}}`

Send a new test approval after publishing. Previously delivered emails cannot be changed.
