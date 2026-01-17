# Web GUI

A web version GUI for roughly the same tasks, but with more interactability

## Run

### Develop

To run the server, you need node.js and related packages:
```bash
# start developer frontend server
cd web/frontend
npm start

# in another terminal, run the API server
python server.py
```

The URL should be something like `http://localhost:5173` (vite default URL).
We use vite, and you can change the code and restart the server with the new code by typing `r` in the vite terminal.

### Build & Run
To build the frontend:
```bash
# build the frontend website, the built code should be in web/frontend/build
cd web/frontend
npm build

# in another terminal, run the API server
python server.py
```

The flask server also hosts the files in `web/frontend/build`, the URL should be something like `http://localhost:5000` (flask default URL).
Note that the server should be hosted on `localhost`, since this is a development flask server, with service that's very easily DoS-ed, and generally shouldn't be exposed. Even without these issues, warframe market API request-per-second limitation also limits the potential of this server being used by multiple people. **Please host your own server (`python server.py`) if you wanna use this, and DON'T EXPOSE THIS SERVER TO PUBLIC.**

> If you do wanna host it on a different computer, please put your server under VPN or use other tactics to access the server without exposing the server to public.