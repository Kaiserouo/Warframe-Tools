from datetime import timedelta

def get_ppm(item_standing, item_plat, total_standing_gathered, total_time: timedelta):
    """
    Args:
        item_standing: The standing price of the item being sold.
            e.g., manifold bond costs 25000 standing
        item_plat: The platinum price of the item being sold.
            e.g., manifold bond sells for 15 plat on warframe.market
        total_standing_gathered: The total standing gathered during the run.
        total_time (timedelta): The total time taken for the run.
            e.g., you can gather 33000 standing in 7 minutes
    
    Returns:
        the platinum per minute (PPM) rate for the farm
        e.g., get_ppm(25000, 15, 33000, timedelta(minutes=7)) returns 2.82 ppm
    """
    total_minute = total_time.total_seconds() / 60
    return (total_standing_gathered / item_standing) * item_plat / total_minute 
    
print(f'Cetus stand PPM: {get_ppm(25000, 15, 33000, timedelta(minutes=7))} plat/min')       # bonds
print(f'Fortuna stand PPM: {get_ppm(25000, 15, 33000, timedelta(minutes=5))} plat/min')     # bonds
print(f'Simaris stand PPM: {get_ppm(75000, 49, 33000, timedelta(minutes=8))} plat/min')     # energy g
print(f'Descendia stand PPM: {get_ppm(5, 5, 34, timedelta(minutes=9))} plat/min')   # arcane concentration
print(f'Descendia stand PPM: {get_ppm(5, 5, 31, timedelta(minutes=7, seconds=28))} plat/min')   # arcane concentration
print(f'Descendia stand PPM: {get_ppm(5, 5, 42, timedelta(minutes=6, seconds=49))} plat/min')   # arcane concentration
print(f'Descendia stand PPM: {get_ppm(5, 5, 49, timedelta(minutes=6, seconds=38))} plat/min')   # arcane concentration