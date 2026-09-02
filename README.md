# Derico Blicca Promoblock

Aurora Promo block: an authored promo card with kicker, title, description, image and calls to action

## Features

- Compatible with Plone 6.0+

## Installation

Add `derico.blicca.promoblock` to your project's dependencies:

```python
# In your pyproject.toml
dependencies = [
    "derico.blicca.promoblock",
    # ...
]
```

Then activate the addon in your Plone site's control panel or via GenericSetup.

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/collective/derico.blicca.promoblock.git
cd derico.blicca.promoblock

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install in development mode
pip install -e ".[test]"
```

### Running Tests

```bash
pytest
```

### Running Tests with Coverage

```bash
pytest --cov=derico.blicca.promoblock --cov-report=html
```

## License

GPL-2.0-or-later

## Author

Maik Derstappen <md@derico.de>
