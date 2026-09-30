"""
it will try to get the webpage source code with selenium
usage: 
    python get_webpage.py --mode <mode> <URL>
option:
    --mode:
        xvcf: it will use xvcf and selenium to get the webpage source code
        remote: it will use remote webdriver to get the webpage source code
                please provide --remote-url <remote_url> to specify the remote webdriver url
    --remote-url: for --mode remote. the remote webdriver url

hidden option:
    --mode xvcf --execute: it will assume we are running in xvcf and will actually use selenium to get the code
        (`python get_webpage.py --mode xvcf` will invoke `xvcf-run -a python get_webpage.py --mode xvcf --execute`)
"""


from selenium import webdriver
from selenium.webdriver.chrome.options import Options

import re, sys
import argparse
import subprocess

parser = argparse.ArgumentParser(description="Get webpage source code")
parser.add_argument("--mode", choices=["xvcf", "remote"], default="xvcf", help="Mode to use")
parser.add_argument("--remote-url", help="URL of the remote webdriver")
parser.add_argument("--execute", action="store_true", help="Execute in xvcf environment")
parser.add_argument("page_url", help="URL of the webpage to get source code from")

def main_xvcf_execute(page_url):
    options = Options()
    driver = webdriver.Chrome(options=options)

    try:
        driver.get(page_url)
        print(driver.page_source)
    finally:
        driver.quit()

def main_remote(page_url, remote_url):
    options = Options()
    driver = webdriver.Remote(remote_url, options=options)

    try:
        driver.get(page_url)
        print(driver.page_source)
    finally:
        driver.quit()

def main_xvcf(page_url):
    import subprocess

    # we are not running in xvcf, so we need to invoke xvcf-run
    subprocess.run(['xvfb-run', '-a', 'python', __file__, '--mode', 'xvcf', '--execute', page_url], check=True)

def main():
    args = parser.parse_args()
    if args.mode == 'xvcf':
        print('Using xvcf webdriver', file=sys.stderr)
        if args.execute:
            main_xvcf_execute(args.page_url)
        else:
            main_xvcf(args.page_url)
    elif args.mode == 'remote':
        print('Using remote webdriver at:', args.remote_url, file=sys.stderr)
        if not args.remote_url:
            print("Error: --remote-url is required for remote mode", file=sys.stderr)
            sys.exit(1)
        main_remote(args.page_url, args.remote_url)

if __name__ == "__main__":
    main()