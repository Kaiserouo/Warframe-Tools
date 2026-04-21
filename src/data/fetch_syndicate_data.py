from lxml import etree
import requests
def to_number(s: str) -> int:
    s = s.replace(',', '')
    return int(s)

syndicates = [
    {
        'name': 'Cavia',
        'url': 'https://wiki.warframe.com/w/Cavia',
        'sections': [
            {'selector': "//*[@id='mw-customcollapsible-bird3wares']/div[1]/div"}
        ],
        'parse': {
            'name': lambda div: div.xpath(".//span/text()")[-1],
            'standing': lambda div: to_number(div.xpath("./p/span/text()")[0])
        }
    },
    {
        'name': 'The Hex',
        'url': 'https://wiki.warframe.com/w/The_Hex_(Syndicate)',
        'sections': [
            {'selector': "//*[@id='mw-customcollapsible-Aoi']/div[1]/div"},
            {'selector': "//*[@id='mw-customcollapsible-Amir']/div[1]/div"},
            {'selector': "//*[@id='mw-customcollapsible-Quincy']/div[1]/div"},
            {'selector': "//*[@id='mw-customcollapsible-Eleanor']/div[1]/div"}
        ],
        'parse': {
            'name': lambda div: div.xpath(".//span/text()")[-1],
            'standing': lambda div: to_number(div.xpath("./p/span/text()")[0])
        }
    },
    {
        'name': 'Roathe',
        'url': 'https://wiki.warframe.com/w/Roathe',
        'sections': [
            {'selector': "//*[@id='mw-customcollapsible-Surplus']/div[1]/div"},
        ],
        'parse': {
            'name': lambda div: div.xpath(".//span/text()")[-1],
            'standing': lambda div: to_number(div.xpath("./p//a/span/text()")[0])
        }
    },
]

def default_mapper():
    pass

def get_syndicate_items(syndicate: dict) -> dict[str, list[str]]:
    """
        must have 'name', 'url', 'sections'
    """
    import itertools
    r = requests.get(syndicate['url'])
    html = etree.HTML(r.content)
    names = list(itertools.chain.from_iterable([html.xpath(section['selector']) for section in syndicate['sections']]))
    return names

def parse_syndicate_div(div, parse_funcs: dict) -> dict:
    return {key: func(div) for key, func in parse_funcs.items()}

def get_syndicate_data(syndicate: dict) -> dict[str, int]:
    """
        must have 'name', 'url', 'sections'

        returns a dictionary of the syndicate's items and their respective standing cost
    """
    import itertools
    r = requests.get(syndicate['url'])
    html = etree.HTML(r.content)
    items = list(itertools.chain.from_iterable([html.xpath(section['selector']) for section in syndicate['sections']]))
    return [parse_syndicate_div(item, syndicate['parse']) for item in items]

additional_syndicates = {}
for syndicate in syndicates:
    data = get_syndicate_data(syndicate)    # list[{'name': str, 'standing': int}]
    additional_syndicates[syndicate['name']] = data
additional_syndicate_names = list(additional_syndicates.keys())

print(f'{additional_syndicate_names = }')
print(f'{additional_syndicates = }')