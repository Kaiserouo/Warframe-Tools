# xvfb-run -a python get_webpage.py <URL>

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

import re, sys

options = Options()
driver = webdriver.Chrome(options=options)

try:
    driver.get(sys.argv[1])
    print(driver.page_source)
finally:
    driver.quit()
