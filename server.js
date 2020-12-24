

const clientSecrets = require('./.spotify.api.client.secrets');

const SpotifyWebApi = require('spotify-web-api-node');

const scopes = ['user-read-private', 'user-read-email', 'user-read-playback-state'];
const state = 'some-state-of-my-choice';

const server = require('express')();
const port = 3001;
const session = require('express-session');
server.use(session({
    secret: 'wololo123', // TODO: ???
    resave: false,
    saveUninitialized: false
}))

const spotifyCallbackPath = `/spotify/callback`;
function spotifyApiOfHost(req) {    
    return new SpotifyWebApi({
        clientId: clientSecrets.clientId,
        clientSecret: clientSecrets.clientSecret,
        redirectUri: `${req.protocol}://${req.headers.host}${spotifyCallbackPath}`
    });
}

server.get('/spotify/auth', (req, res) => {
    const authorizeURL = spotifyApiOfHost(req).createAuthorizeURL(scopes, state, true);
    res.redirect(authorizeURL);
});

server.get(spotifyCallbackPath, (req, res) => {
    if (req.query.state != state)
        res.send("Invalid state.");
    else {
        spotifyApiOfHost(req)
            .authorizationCodeGrant(req.query.code).then(
                data => {
                    req.session.spotifyAuth = data.body;
                    res.sendStatus(200);
                },
                err => res.send('Something went wrong!')
            );
    }
});

function getData(server, route, apiThen) {
    server.get(route, (req, res) => {
        if (req.session === undefined || req.session.spotifyAuth === undefined) {
            res.sendStatus(401);
        } else {
            const spotifyApi = spotifyApiOfHost(req);
            spotifyApi.setAccessToken(req.session.spotifyAuth.access_token);
            apiThen(spotifyApi, res);
        }
    });
}

getData(server, '/spotify/api/my-name',
    (api, res) => api.getMe().then(
        data => res.json(data.body.display_name),
        err => res.send('Something went wrong!')
    ));

getData(server, '/spotify/api/my-playing-song-title',
    (api, res) => api.getMyCurrentPlayingTrack().then(
        data => res.json(data.body),
        err => res.send('Something went wrong!')
    ));

server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on port ${port}`);
});