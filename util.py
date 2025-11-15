import contextlib
import joblib
from tqdm import tqdm
from typing import *

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

def str_type_indent(obj, iter_limit_items: int = 10, dict_limit_items: int = 1000000, 
                    explicit_type: bool=False, indent="    ") -> str:
    """
        ref. str_type
    """
    def str_indent(s, indent: str):
        """
            to indent a whole multiline block
            s: the multiline block
        """
        return '\n'.join([f'{indent}{line}' for line in s.split('\n')])

    # ---

    def str_str(obj: str):
        return f'"{obj}"'
    
    def str_direct(obj):
        "for simple things that doesn't need the type to show, e.g., python's int, float, None"
        return f'{obj}'

    def str_object(obj: object):
        "default case, for anything that is not listed below, including np.float32 or something like that"
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
                                if so, won't dfs again
                                used when you have special stringify function for the iterated object,
                                e.g., dict
        """
        if is_obj_str_list:
            s_ls = obj
        else:
            # stringify the iterated object
            # the if-else is to prevent dfs()ing the object over the limit count
            # since we won't see them in the result anyway
            s_ls = [dfs(o) if _ < limit else None for _, o in enumerate(obj)]
            
        if len(s_ls) == 0:
            # just don't do intent at all
            s = f""
        else:
            if len(s_ls) > limit:
                # limit the items
                s_ls = s_ls[:limit] + [f'...({len(s_ls) - limit} more)']
            
            if all([type_map.get(o.__class__, None) == str_direct for _, o in zip(range(limit), obj)]):
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
    
    # def str_tensor(obj: torch.Tensor):
    #     "won't actually show the content"
    #     return f'torch.Tensor[size={list(obj.size())}, dtype={obj.dtype}, dev={obj.device}]()'
    
    # def str_np_ndarray(obj: np.ndarray):
    #     "won't actually show the content"
    #     return f'np.ndarray[shape={list(obj.shape)}, dtype={obj.dtype}]()'
    
    def str_set(obj: set):
        return f'Set[len={len(obj)}]({str_iterable_inner(obj)})'
    
    def str_dict(obj: set):
        s_ls = [f'{dfs(key)}: {dfs(value)}' for key, value in obj.items()]
        s = f'Dict[len={len(s_ls)}]({str_iterable_inner(s_ls, dict_limit_items, True)})'
        return s
    
    if explicit_type:
        # make simple types also show the type
        str_direct = str_object

    type_map = {
        list: str_list,
        tuple: str_tuple,
        # torch.Tensor: str_tensor,
        # np.ndarray: str_np_ndarray,
        set: str_set,
        dict: str_dict,
        str: str_str,
        int: str_direct,
        float: str_direct,
        None.__class__: str_direct,
        Iterable: str_iterable,
    }

    def dfs(obj: object):
        for tp, str_fn in type_map.items():
            if isinstance(obj, tp):
                return str_fn(obj)
        return str_object(obj)

    return dfs(obj)

def str_type(obj, iter_limit_items: int = 10, dict_limit_items: int = 1000000, 
             explicit_type: bool=False, indent: int | str | None = None):
    """
        Actually dump everything about... a thing.
        can handle list and tensors and all kinds of stuff.
        useful when you don't know what a thing is and don't wanna just print()
        and see a bunch of tensor values, such as the output of dataloader...

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
            >>> str_type([torch.randn(1, 2, 3), torch.randn(3, 5, 100), 17239813], explicit_type=True)
            List[len=2](torch.Tensor[size=[1, 2, 3], dtype=torch.float32, dev=cpu](), int(17239813))

        Args:
            obj: the object to be dumped
            iter_limit_items: the maximum number of items to show in an iterable (other than dict)
            dict_limit_items: the maximum number of items to show in a dict
            explicit_type: whether to show the type of simple objects (e.g., int, float, None)
            indent: the indentation of the string. 
                    if int, it will be the number of spaces to indent
                    if str, it will be the string to indent
                    if None, the string will be returned without newlines
    """
    if indent is None:
        return str_type_indent(obj, iter_limit_items, dict_limit_items, explicit_type, '').replace('\n', '')
    elif isinstance(indent, int):
        return str_type_indent(obj, iter_limit_items, dict_limit_items, explicit_type, ' ' * indent)
    else:
        return str_type_indent(obj, iter_limit_items, dict_limit_items, explicit_type, str(indent))
