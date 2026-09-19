# Alecaframe

Alecaframe's code is at `C:\Users\User\AppData\Local\Overwolf\Extensions\afmcagbpgggkpdkokjhjkllpegnadmkignlonpjm\2.6.93`. If the hash changes, you should find it in the extension folder.

The code within separate into 2 parts: `web` and `NET`. According to `manifest.json`, there is an extra object `AlecaFrameWrapper` in `NET/AlecaFrameClientLib.dll`, which, in `web/uninstall.html`, is defined as `var plugin = new OverwolfPlugin("AlecaFrameWrapper", true)`. I suppose that's where all the `plugin.get().<FUNCTION>()`'s implementation comes from.

> For example, the `plugin.get().GetBuySellWindowData(...)` in `web/assets/js/main/mainInventory.js` has implementation in `NET/AlecaFrameClientLib.dll`, and the path is `AlecaFrameClientLib/OverwolfWrapper/GetBuySellWindowData`. And then you can see it's the real time warframe market window at the right side of the Alecaframe panel.

You can disassemble the code with ILSpy or JetBrains dotPeek (I use the latter.)

## Data

There are some data available for fetching. Usually you can find those implementation in the DLL file by looking up the usage of `MyWebClient` or `HTTPHandler` in `AlecaFrameClientLib.Utils`.

You can also follow the address variables, which is defined in `AlecaframeClientLib`'s `StaticData`

```c#
public static string CDNdomain = "cdn.alecaframe.com";
public static string baseDomain = "alecaframe.com";
public static string APIdomain = "api." + StaticData.baseDomain;    // api.alecaframe.com
public static string PricesAPIHostname = $"https://{StaticData.APIdomain}/prices";
public static string RivenAPIHostname = $"https://{StaticData.APIdomain}/rivens";
public static string MLAPIHostname = $"https://{StaticData.APIdomain}/ml";
public static string LogAPIHostname = StaticData.APIdomain + "/log";
public static string StatsAPIHostname = "https://stats." + StaticData.baseDomain;
public static string CachedWFMAPIHostname = $"wfmdirectcache.{StaticData.baseDomain}/";
public static string imageURLPrefix = $"https://{StaticData.CDNdomain}/warframeData/img/";
public static string logSettingsURL = "https://alecaframe---customcdndata.pages.dev/logSettings.txt";
```

### Basic

In the javascript fileS, you can find a request to `https://cdn.alecaframe.com/warframeData/custom/basic.json`.
This contains somewhat unimportant data:

```json
{
    "items": {
        "/Lotus/Weapons/Tenno/LongGuns/SapientPrimary/SapientPrimaryWeapon": {
            "name": "Acceltra",
            "pic": "SapientPrimaryWeapon.png",
            "wiki": "Acceltra"
        },
        // ...
    },
    "nodeXP": {
        "MarsToCeresJunction": 1000,
        // ...
    },
    "maxLevelOverrides": {
        "/Lotus/Powersuits/EntratiMech/NechroTech": 40,
        // ...
    }
}
```

### Price Data

From `AlecaFrameClientLib.Data > PriceHelper`'s `GetLazyItemPrice` and `Flush`, we can figure out how to request the price data:

```bash
$ curl -H "Content-type: application/json" -d '["protea_prime_chassis_blueprint"]' 'https://api.alecaframe.com/prices/priceData'
[{"post":12,"insta":8,"postMax":12,"minR0":15,"minRMax":15,"volume":68}]
```

i.e., do a POST request to `https://api.alecaframe.com/prices/priceData`, with the body as a json list of warframe market item names (you can get it from e.g., inside the URL). The content type must be set to json.

The return values are:
```
ReturnValue := [ItemPrice, ...]
ItemPrice := {
    "post": int,        // WTS price
    "insta": int,       // WTB price
    "postMax": int,     // WTS price for max ranked mod / arcane
    "minR0": int,       // (unused, not sure)
    "minRMax": int,     // (unused, not sure)
    "volume": int       // (unused, not sure) 
}
```