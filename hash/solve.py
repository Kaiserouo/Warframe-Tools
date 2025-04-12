from z3 import *

def simple_hash(str):
    """
        replicate the javascript version of simple hash
        note the shift deals with 32 bit integer but normal
        addition / subtraction is unbounded
    """
    def shift(a, b):
        ret = (a << b) & 0xFFFFFFFF     # truncated into 32 bit, will be positive
        ret -= ((ret >> 31) & 1) << 32  # make sure it's signed 32 bit
        return ret
    
    h = 0
    for c in str:
        n = ord(c)
        h = n + shift(h, 6) + shift(h, 16) - h
    return h

def simple_hash_v2(str):
    """
        guarentees that simple_hash(str) & 0xFFFFFFFF == simple_hash_v2(str) & 0xFFFFFFFF
        at least it looks very linear in Z/Z(2**32)
        in fact, since mul is a constant, it becomes:
        
        h = sum_{k=0}^{L-1}(mul ** (L-1-i) * n_i)
    """
    import numpy as np
    mul = pow(2, 6) + pow(2, 16) - 1
    
    h = np.uint32(0)
    for c in str:
        n = np.uint32(ord(c))
        h = n + mul * h
    return int(h)

def solver_z3_ver1(target_hash, str_len):
    """
        The simplest version, not optimized.
        solving 'khraja' with search space [97, 122] takes 3.2s
    """
    def shift(a, b):
        ret = (a << b) & BitVecVal(0xFFFFFFFF, 64)
        ret -= ((ret >> 31) & 1) << 32
        return ret
        
    s = Solver()

    chars = [BitVec(f'c{i}', 64) for i in range(str_len)]

    for c in chars:
        # s.add(c >= 32, c <= 126)
        s.add(c >= 97, c <= 122)

    h = BitVecVal(0, 64)

    for c in chars:
        n = c
        shifted1 = shift(h, 6)
        shifted2 = shift(h, 16)
        h = n + shifted1 + shifted2 - h

    s.add(h == target_hash)

    if s.check() == sat:
        model = s.model()
        result = ''.join([chr(model[c].as_long()) for c in chars])
        return result
    else:
        return None

def solver_z3_ver2(target_hash, str_len):
    """
        add intermediate variables
        solving 'khraja' with search space [97, 122] takes 1.3s
        ref. https://stackoverflow.com/questions/48754290/z3-how-to-improve-performance
    """
    
    s = Solver()
    
    counter = 0
    def add_im_var(formula):
        nonlocal counter
        counter += 1
        var = BitVec(f'var_{counter}', 64)
        s.add(var == formula)
        return var
    
    def shift(a, b):
        ret = (a << b) & BitVecVal(0xFFFFFFFF, 64)
        ret -= ((ret >> 31) & 1) << 32
        return ret
    
    def slower_shift(a, b):
        # this makes things slower...
        # with this, solving 'khraja' with search space [97, 122] takes 18.3s
        # maybe that's too much intermediate variables...
        ret = add_im_var(a << b)
        ret = add_im_var(ret & BitVecVal(0xFFFFFFFF, 64))
        a = add_im_var((ret >> 31) & 1)
        a = add_im_var(a << 32)
        ret = add_im_var(ret - a)
        return ret

    chars = [BitVec(f'c{i}', 64) for i in range(str_len)]

    for c in chars:
        # s.add(c >= 32, c <= 126)
        s.add(c >= 97, c <= 122)

    last_h = BitVec(f'h_start', 64)
    s.add(last_h == 0)

    for i, c in enumerate(chars):
        shifted1 = add_im_var(shift(last_h, 6))
        shifted2 = add_im_var(shift(last_h, 16))
        cur_h = add_im_var(c + shifted1 + shifted2 - last_h)
        
        last_h = cur_h

    s.add(last_h == target_hash)

    if s.check() == sat:
        model = s.model()
        result = ''.join([chr(model[c].as_long()) for c in chars])
        return result
    else:
        return None

def solver_z3_32bit(target_hash, str_len):
    """
        maybe use 32 bit can make it faster?
        nope, somehow solving 'khraja' with search space [97, 122] takes 10~20s
    """
    s = Solver()

    counter = 0
    def add_im_var(formula):
        nonlocal counter
        counter += 1
        var = BitVec(f'var_{counter}', 32)
        s.add(var == formula)
        return var

    chars = [BitVec(f'c{i}', 32) for i in range(str_len)]

    for c in chars:
        s.add(c >= 97, c <= 122)

    last_h = add_im_var(0)

    for c in chars:
        n = c
        shifted1 = add_im_var((last_h << 6))
        shifted2 = add_im_var((last_h << 16))
        cur_h = add_im_var((n + shifted1 + shifted2 - last_h))
        last_h = cur_h

    s.add(last_h & 0xFFFFFFFF == target_hash & 0xFFFFFFFF)

    if s.check() == sat:
        model = s.model()
        result = ''.join([chr(model[c].as_long()) for c in chars])
        return result
    else:
        return None

def solver_brute_force(target_hash, str_len):
    """
        this is a joke don't use this lol
    """
    import string, itertools
    for s in itertools.product(string.ascii_lowercase, repeat=str_len):
        s = ''.join(s)
        if simple_hash(s) == target_hash:
            return s
    return None

def benchmark(sample_str, solver_func):
    """
        given a sample string to solve, show the time it takes to run the solver
        (not actually a benchmark since it takes long enough to solve once...)
    """
    import time
    start_time = time.time()
    
    target_hash = simple_hash(sample_str)
    str_len = len(sample_str)
    
    result = solver_func(target_hash, str_len)

    print(f'\n{solver_func.__name__}')
    print(f'{sample_str = }, {simple_hash(sample_str) = }')
    if result is not None:
        print(f'{result = }, {simple_hash(result) = }')
    else:
        print(f'Can\'t solve')
        
    end_time = time.time()
    t = end_time - start_time
    print(f'Time taken: {t} seconds')

if __name__ == '__main__':
    """
        try some stuff here
    """
    sample_str = "khrajahuxata"
    sample_str = "khraja"
    # benchmark(sample_str, solver_z3_ver1)
    # benchmark(sample_str, solver_z3_ver2)
    # benchmark(sample_str, solver_z3_32bit)
    # benchmark(sample_str, solver_brute_force)
    # print(simple_hash('khrajahuxata'))
    print(simple_hash('khrajahuxata') & 0xFFFFFFFF)
    # print(simple_hash_v2("khra"))

    print([ord(s) for s in "khra"])

    import numpy as np
    print(np.array([ -79 ,  16  , 47 , 110 ,   0]) + np.array([ -18 , 91 ,  57  , 4 , 256]))