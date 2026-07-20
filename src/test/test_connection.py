# test.py
import subprocess
import unittest

from ..warframe_market import retry_request

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"

def try_curl(url):
    with open("/dev/null", "w") as devnull:
        a = subprocess.Popen(["curl", url], stdout=devnull, stderr=devnull)
        a.wait(10)
    return a.returncode == 0, a.returncode

class TestConnection(unittest.TestCase):
    def test_warframe_market_curl(self):
        """
        curl https://warframe.market
        """
        is_success, returncode = try_curl("https://warframe.market")
        self.assertTrue(is_success, 'curl command failed with return code {}'.format(returncode))

    def test_api_warframe_market_curl_items(self):
        is_success, returncode = try_curl("https://api.warframe.market/v2/items")
        self.assertTrue(is_success, 'curl command failed with return code {}'.format(returncode))

    def test_api_warframe_market_curl_item(self):
        is_success, returncode = try_curl("https://api.warframe.market/v2/items/your_item_id")
        self.assertTrue(is_success, 'curl command failed with return code {}'.format(returncode))

    def test_warframe_market_socket(self):
        r = retry_request(f'https://api.warframe.market/v2/orders/item/serration', headers={
            'accept': 'application/json',
            'Platform': 'pc',
            'User-agent': USER_AGENT
        }, n_times=5)
        self.assertEqual(r.status_code, 200, 'Failed to connect to warframe market API after multiple attempts. Status code: {}'.format(r.status_code))
        

if __name__ == '__main__':
    unittest.main()