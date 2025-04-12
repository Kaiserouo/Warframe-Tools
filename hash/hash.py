import numpy as np

def simple_hash(str):
    def shift(a, b):
        a &= 0xFFFFFFFF
        if a > 0x7FFFFFFF: a -= 0x100000000
        a = np.int32(a)
        return int(np.bitwise_left_shift(a, b))
    h = 0
    for c in str:
        n = ord(c)
        h = n + shift(h, 6) + shift(h, 16) - h
    return h

print(simple_hash("khrajahuxata")) # -4998689786

def shift(a, b):
    a &= 0xFFFFFFFF
    if a > 0x7FFFFFFF: a -= 0x100000000
    a = np.int32(a)
    return int(np.bitwise_left_shift(a, b))

def modified_shift(a, b):
    ret = (a << b) & 0xFFFFFFFF
    ret -= ((ret >> 31) & 1) << 32
    return ret

print(shift(2147483647 * 3, 2))
print(modified_shift(2147483647 * 3, 2))