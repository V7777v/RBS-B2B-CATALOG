import json

try:
    with open('src/App.tsx', 'r') as f:
        pass # We will just use the frontend code to see how to fetch, but actually we can't easily fetch the google sheet from a python script locally since it uses fetch to a proxy/url.
except Exception as e:
    pass

