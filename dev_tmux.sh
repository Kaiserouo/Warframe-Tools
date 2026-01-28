#!/bin/bash

# sets up the development environment in tmux
# specifically, react-vite on the left and python backend server on the right

# please make sure that you use LF instead of CRLF in VSCode setting

tmux new-session -d -s wf;
tmux send-keys -t wf 'cd src/web/frontend; npm start' C-m;
tmux split-window -h;
tmux send-keys -t wf 'python -m src.web.backend.server' C-m;

tmux attach -t wf;