const app      = require('express')();
const passport = require('./middleware/auth.js');

app.use(require('body-parser').urlencoded({ extended: false }));
app.use(require('body-parser').json());
app.use
(
    require('express-session')
    ({
        secret            : process.env.SESSION_SECRET || 'CHANGE_ME',
        resave            : true,
        saveUninitialized : true
    })
);
app.use(passport.initialize());
app.use(passport.session());

if(process.env.DEV && !process.env.TESTING)
{
    app.use((req, res, next) =>
    {
        console.log(req.method, req.originalUrl);
        if(req.session && req.session.captcha)
            console.log('Previously set captcha', req.session.captcha);
        else
            console.log('No previously set captcha solution found');
        if(req.method === 'POST')
            console.log('Request body :', req.body);
        console.log();

        next();
    });

    app.use('/test', (req, res) =>
    {
        res.sendFile(__dirname + '/test/controller/api_0.0.0_manual_test.html');
    });
}


app.use(require('./controller/home.js'));
app.use(require('./controller/api_0.0.0/user.js'));
app.use(require('./controller/404.js')); // last router to use

let db = require('./model/setup.js');
let http_server;

function start()
{
    return db.connect()
    .then(() =>
    {
        http_server = app.listen(process.env.PORT || '9001');

        http_server.on('error', (err) =>
        {
            console.error('Error starting server:');
            console.error(err);
            if(db.sequelize)
                db.sequelize.close().then(() => process.exit(1));
            else process.exit(1);
        });

        http_server.on('close', () =>
        {
            if(db.sequelize) db.sequelize.close();
        });

        return new Promise((resolve, reject) =>
        {
            http_server.on('listening', () =>
            {
                console.info
                (
                    '- HTTP server started,',
                    http_server.address().family === 'IPv6' ?
                        'http://[' + http_server.address().address + ']:'
                        + http_server.address().port
                        :
                        'http://' + http_server.address().address + ':'
                        + http_server.address.port
                );

                return resolve(http_server);
            });
        });
    });
}

if(!process.env.TESTING) start();

module.exports.app    = app;
module.exports.start  = start;