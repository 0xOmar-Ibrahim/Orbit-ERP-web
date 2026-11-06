import json
import logging
from decimal import Decimal
from urllib.request import urlopen

from django.core.cache import cache
from django.db.models import Case, When, Value, F, ExpressionWrapper, DecimalField

logger = logging.getLogger(__name__)

# Free, keyless API; rates are "units of currency per 1 USD" and refresh once a day.
RATES_URL = "https://open.er-api.com/v6/latest/USD"
CACHE_KEY = "crm_usd_exchange_rates"
CACHE_SECONDS = 60 * 60
REQUEST_TIMEOUT_SECONDS = 5

# Used when the API can't be reached. Units per 1 USD; update by hand if they drift too far.
FALLBACK_RATES = {
    "USD": Decimal("1"),
    "EGP": Decimal("56"),
    "EUR": Decimal("0.9"),
}

USD_FIELD = DecimalField(max_digits=20, decimal_places=2)
RATE_FIELD = DecimalField(max_digits=20, decimal_places=10)


def get_usd_rates():
    """Return {currency_code: units per 1 USD}, from the cache, the API, or the fallback table."""
    rates = cache.get(CACHE_KEY)
    if rates:
        return rates

    try:
        with urlopen(RATES_URL, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            payload = json.load(response)
        if payload.get("result") != "success":
            raise ValueError(payload.get("error-type", "unexpected response"))
        rates = {code: Decimal(str(rate)) for code, rate in payload["rates"].items()}
    except Exception as exc:
        logger.warning("Exchange rate API unavailable, using fallback rates: %s", exc)
        # Cache the fallback briefly so a down API isn't hit on every request
        cache.set(CACHE_KEY, FALLBACK_RATES, 10 * 60)
        return FALLBACK_RATES

    cache.set(CACHE_KEY, rates, CACHE_SECONDS)
    return rates


def usd_value_expression(currencies, field="estimated_value"):
    """
    ORM expression converting `field` to USD per row, based on the row's currency.
    Only the given currencies get a CASE branch; anything else (or without a known rate)
    is treated as already being in USD.
    """
    rates = get_usd_rates()
    whens = [
        When(currency=code, then=Value(Decimal(1) / rates[code], output_field=RATE_FIELD))
        for code in currencies
        if code != "USD" and rates.get(code)
    ]
    multiplier = Case(*whens, default=Value(Decimal(1), output_field=RATE_FIELD), output_field=RATE_FIELD)
    return ExpressionWrapper(F(field) * multiplier, output_field=USD_FIELD)
