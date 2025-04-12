from lxml import etree
import requests
syndicates = [
    # {
    #     'name': 'Cavia',
    #     'url': 'https://warframe.fandom.com/wiki/Cavia',
    #     'sections': [
    #         {'selector': "//*[@id='mw-customcollapsible-bird3wares']/div[1]/div//a/span/text()"}
    #     ],
    # },
    # {
    #     'name': 'The Hex',
    #     'url': 'https://warframe.fandom.com/wiki/The_Hex_(Syndicate)',
    #     'sections': [
    #         {'selector': "//*[@id='mw-customcollapsible-Aoi']/div[1]/div//a/span/text()"},
    #         {'selector': "//*[@id='mw-customcollapsible-Amir']/div[1]/div//a/span/text()"},
    #         {'selector': "//*[@id='mw-customcollapsible-Quincy']/div[1]/div//a/span/text()"},
    #         {'selector': "//*[@id='mw-customcollapsible-Eleanor']/div[1]/div//a/span/text()"}
    #     ],
    # },
    {
        'name': 'The Hex',
        'url': 'https://warframe.fandom.com/wiki/The_Hex_(Syndicate)',
        'sections': [
            {'selector': "//*[@id='mw-customcollapsible-Aoi']/div[1]/div"},
            {'selector': "//*[@id='mw-customcollapsible-Amir']/div[1]/div"},
            {'selector': "//*[@id='mw-customcollapsible-Quincy']/div[1]/div"},
            {'selector': "//*[@id='mw-customcollapsible-Eleanor']/div[1]/div"}
        ],
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

def parse_syndicate_div(div) -> dict[str, int]:
    return {
        'name': div.xpath(".//span/text()")[-1],
        'standing': div.xpath("./p/span/text()")[0]
    }

def get_syndicate_data(syndicate: dict) -> dict[str, int]:
    """
        must have 'name', 'url', 'sections'

        returns a dictionary of the syndicate's items and their respective standing cost
    """
    import itertools
    r = requests.get(syndicate['url'])
    html = etree.HTML(r.content)
    items = list(itertools.chain.from_iterable([html.xpath(section['selector']) for section in syndicate['sections']]))
    return [parse_syndicate_div(item) for item in items]

print(get_syndicate_data(syndicates[0]))