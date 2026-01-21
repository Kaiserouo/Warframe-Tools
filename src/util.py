import contextlib
import joblib
from tqdm import tqdm
from typing import *
import colorama

RESET = colorama.Style.RESET_ALL
YELLOW, BG_YELLOW = colorama.Fore.YELLOW, colorama.Back.YELLOW
CYAN, BG_CYAN = colorama.Fore.CYAN, colorama.Back.CYAN
RED, BG_RED = colorama.Fore.RED, colorama.Back.RED
GREEN, BG_GREEN = colorama.Fore.GREEN, colorama.Back.GREEN
MAGENTA, BG_MAGENTA = colorama.Fore.MAGENTA, colorama.Back.MAGENTA
BLUE, BG_BLUE = colorama.Fore.BLUE, colorama.Back.BLUE
WHITE, BG_WHITE = colorama.Fore.WHITE, colorama.Back.WHITE

@contextlib.contextmanager
def tqdm_joblib(tqdm_object):
    """
        https://stackoverflow.com/questions/24983493/tracking-progress-of-joblib-parallel-execution/58936697#58936697

        Context manager to patch joblib to report into tqdm progress bar given as argument

        ```
        from math import sqrt
        from joblib import Parallel, delayed

        with tqdm_joblib(tqdm(desc="My calculation", total=10)) as progress_bar:
            Parallel(n_jobs=16)(delayed(sqrt)(i**2) for i in range(10))
        ```
    """
    class TqdmBatchCompletionCallback(joblib.parallel.BatchCompletionCallBack):
        def __call__(self, *args, **kwargs):
            tqdm_object.update(n=self.batch_size)
            return super().__call__(*args, **kwargs)

    old_batch_callback = joblib.parallel.BatchCompletionCallBack
    joblib.parallel.BatchCompletionCallBack = TqdmBatchCompletionCallback
    try:
        yield tqdm_object
    finally:
        joblib.parallel.BatchCompletionCallBack = old_batch_callback
        tqdm_object.close()

def str_type_indent(obj, iter_limit_items: int = 10, dict_limit_items: int = 1000000, array_limit_items: int = -1,
                    explicit_type: bool=False, indent="    ", print_type: Literal['str', 'type'] = 'str', print_unknown_obj_vars: bool = False) -> str:
    """
    ref. str_type

    NOTE: 
    - The indent code (str_indent) wouldn't be really fast since it reconstructs the string every time
        it is indented. For smaller object it's fine but for big and deep object it might cause some performance 
        problems indenting a big chunk of text. For now it's not exactly a big deal
    - if you don't have some packages (e.g., torch, numpy), please remove the corresponding code in this function manually
      (i dont have a good way to deal with that now)
    """

    def str_indent(s, indent: str):
        """
            to indent a whole multiline block
            s: the multiline block
        """
        return '\n'.join([f'{indent}{line}' for line in s.split('\n')])

    # ---

    def str_str(obj: str):
        "just for strings"
        return f'"{obj}"'
    
    def str_direct(obj):
        "for simple things that doesn't need the type to show, e.g., python's int, float, None"
        return f'{obj}'

    def str_object(obj: object):
        "default case, for anything that is not listed below, including np.float32 or something like that"
        if print_unknown_obj_vars and hasattr(obj, '__dict__'):
            # if we wanna print the variables (vars()) of the unknown object
            prop_dict = vars(obj)
            s_ls = [f'{key}: {dfs(value)}' for key, value in prop_dict.items()]
            return f'{str(obj.__class__)[8:-2]}({str_iterable_inner(s_ls, 100000, True)})'
        return f'{str(obj.__class__)[8:-2]}({obj})'
    
    def str_iterable_inner(obj: Iterable, limit=iter_limit_items, is_obj_str_list: bool = False):
        """
            used when you wanna iterate something, it deals with the indentation and limit

            f"List[len=4]({str_iterable_inner([1, 2, 3, [4, 5]])})"
            -> List[len=4](
                   1, 
                   2, 
                   3, 
                   List[len=2](4, 5)
               )
            
            Args:
                limit: the maximum number of items to show, the rest would be shown as "... (%d more)"
                is_obj_str_list: whether the object is a list of object strings (objects that is already "dfs()"ed)
                                if so, we won't do dfs again
                                used when you have special stringify function for the iterated object, 
                                e.g., dict needs to show the keys and values in a special way: like "key: value"
        """
        if is_obj_str_list:
            s_ls = obj
        else:
            # stringify the iterated object
            # the if-else is to prevent dfs()ing the object over the limit count
            # since we won't see them in the result anyway
            # we do need to iterate the whole thing to get the length (note that Iterable doesn't necessarily have __len__)
            s_ls = [dfs(o) if _ < limit else None for _, o in enumerate(obj)]
            
        if len(s_ls) == 0:
            # just don't do intent at all
            s = f""
        else:
            if len(s_ls) > limit:
                # limit the items
                s_ls = s_ls[:limit] + [f'...({len(s_ls) - limit} more)']
            
            if all([type_map_str.get(o.__class__, None) == str_direct for _, o in zip(range(limit), obj)]):
                # if all items are direct, don't do indentation
                s = ", ".join(s_ls)
            else:
                # do indentation
                inner = ", \n".join(s_ls)
                s = f"\n{str_indent(inner, indent)}\n"
        return s
    
    def str_iterable(obj: Iterable):
        "for default iterables that i don't really know the type of"
        s_ls = [dfs(o) for o in obj]
        s = f"{str(obj.__class__)[8:-2]}[len={len(s_ls)}]({str_iterable_inner(obj)})"
        return s
    
    def str_list(obj: list):
        return f'List[len={len(obj)}]({str_iterable_inner(obj)})'
    
    def str_tuple(obj: tuple):
        return f'Tuple[len={len(obj)}]({str_iterable_inner(obj)})'
    
    def str_set(obj: set):
        return f'Set[len={len(obj)}]({str_iterable_inner(obj)})'
    
    def str_dict(obj: set):
        s_ls = [f'{dfs(key)}: {dfs(value)}' for key, value in obj.items()]
        s = f'Dict[len={len(s_ls)}]({str_iterable_inner(s_ls, dict_limit_items, True)})'
        return s

    "-----------------------------"

    def type_object(obj: object):
        return f'{str(obj.__class__)[8:-2]}'

    def type_iterable_inner(obj: Iterable, is_obj_str_list: bool = False):
        s_ls = obj if is_obj_str_list else [dfs(o) for o in obj]

        s_ls = list(set(s_ls))
        s_ls.sort()  # sort by string representation for consistency

            
        if len(s_ls) == 0:
            # just don't do intent at all
            s = f""
        else:
            # do indentation
            inner = " | \n".join(s_ls)
            s = f"\n{str_indent(inner, indent)}\n"
        return s

    def type_iterable(obj: Iterable):
        "for default iterables that i don't really know the type of"
        # s = f"{str(obj.__class__)[8:-2]}[len={len(obj)}]({type_iterable_inner(obj)})"
        s = f"{str(obj.__class__)[8:-2]}({type_iterable_inner(obj)})"
        return s
    
    def type_dict(obj: dict):
        s_ls = [f'{dfs(key)}: {dfs(value)}' for key, value in obj.items()]
        s = f'dict({type_iterable_inner(s_ls, True)})'
        return s

    if explicit_type:
        # make simple types also show the type
        str_direct = str_object

    type_map_str = {
        list: str_list,
        tuple: str_tuple,

        set: str_set,
        dict: str_dict,
        str: str_str,
        int: str_direct,
        float: str_direct,
        None.__class__: str_direct,

        Iterable: str_iterable,
    }

    type_map_type = {
        list: type_iterable,
        tuple: type_iterable,

        set: type_iterable,
        dict: type_dict,
        str: type_object,
        int: type_object,
        float: type_object,
        None.__class__: type_object,

        Iterable: type_iterable,
    }

    def dfs(obj: object):
        if print_type == 'type':
            # if we want to print the type of the object
            for tp, type_fn in type_map_type.items():
                if isinstance(obj, tp):
                    return type_fn(obj)                
            return type_object(obj)
        elif print_type == 'str':
            for tp, str_fn in type_map_str.items():
                if isinstance(obj, tp):
                    return str_fn(obj)
            return str_object(obj)

    return dfs(obj)

def str_type(obj: Any, iter_limit_items: int = 10, dict_limit_items: int = 1000000, array_limit_items: int = -1,
             explicit_type: bool = False, indent: int | str | None = None, print_type: Literal['str', 'type'] = 'str',
             print_unknown_obj_vars: bool = False) -> str:
    """
    Actually dump everything about... a thing.
    useful when you don't know what a thing is and don't wanna just use a lot of print() and see a bunch of tensor values, 
    such as the output of dataloader, or something that you wanna know the explicit type of but don't wanna do print(type(obj)) yourself
    can handle list and tensors and all kinds of stuff
    also acts as a general indentation printer if you have special classes json.dumps() cannot handle

    e.g., 
        >>> str_type({1: 2, 3: [4, 5], 6: torch.randn(1, 2, 3), 7: "hello", 8: np.array([2, 3, 4]), 9: ["aaa", "bbb", ""]}, indent=4)
        Dict[len=6](
            1: 2, 
            3: List[len=2](4, 5), 
            6: torch.Tensor[size=[1, 2, 3], dtype=torch.float32, dev=cpu](), 
            7: "hello", 
            8: np.ndarray[shape=[3], dtype=int64](), 
            9: List[len=3](
                "aaa", 
                "bbb", 
                ""
            )
        )
        >>> str_type([torch.randn(1, 2, 3), 17239813], explicit_type=True, indent=4)
        List[len=2](
            Tensor[size=[1, 2, 3], dtype=torch.float32](), 
            int(17239813)
        )
        >>> str_type([torch.randn(1, 2, 3), 17239813], explicit_type=True)
        List[len=2](torch.Tensor[size=[1, 2, 3], dtype=torch.float32, dev=cpu](), int(17239813))

    Args:
        obj: the object to be dumped
        iter_limit_items: the maximum number of items to show in an iterable (other than dict)
            if the size of the iter is larger than this, will only print up to this amount of items
            and skip the rest by adding '... (%d more)' at the end
        dict_limit_items: the maximum number of items to show in a dict
        array_limit_items: the maximum number of items to show in an array-like object (i.e., tensor, np.ndarray)
            if the size of the array is larger than this, no actual content would be printed
        explicit_type: whether to show the type of simple objects (e.g., int, float, None)
        indent: the indentation of the string. 
            if int, it will be the number of spaces to indent
            if str, it will be the string to indent
            if None, the result won't be indented, and the result will be taken of any newlines
            (if you really wanna keep the newlines, use indent=0)
        print_type: whether to print the string representation of the object or just the types
        print_unknown_obj_vars: if we see an unknown object (i.e., not in the type map), whether to print its __dict__ variables
            if False or the object doesn't have __dict__, we will do str() to represent any object not in the type map
            if True and the object has __dict__, we will print the __dict__ variables of the object using str_type_indent recursively
            recommend to set to True if you have your own class and don't wanna implement __str__ for it,
            but sometimes looking too deep into objects from other sources may cause problems (e.g., printing something that raises exception),

    Returns:
        str: the string representation of the object
    
    Note:
        - do not use this object to print large or infinite iterators (except special cases like DataLoader),
          it will try to iterate the whole thing and if you have e.g., an infinite interator this function won't work
        - if you think this is too slow and needs optimization, please refer to `str_type_indent`'s docstring
    """
    if indent is None:
        return str_type_indent(obj, iter_limit_items, dict_limit_items, array_limit_items, explicit_type, '', print_type, print_unknown_obj_vars).replace('\n', '')
    elif isinstance(indent, int):
        return str_type_indent(obj, iter_limit_items, dict_limit_items, array_limit_items, explicit_type, ' ' * indent, print_type, print_unknown_obj_vars)
    else:
        return str_type_indent(obj, iter_limit_items, dict_limit_items, array_limit_items, explicit_type, str(indent), print_type, print_unknown_obj_vars)

