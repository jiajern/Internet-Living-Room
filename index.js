const express  = require('express');
const app      = express();
const passport = require('./middleware/auth.js');

global.creators = {};
/* example :
{
    '<user id>' : <channel id>,
}
*/
global.channels = {};
/* example :
{
    '0fe38ca7-9ca3-433d-a464-b5fce48cb798' :
    {
        creator : <uid>,
        current_video : <video id>,
        video_length  : <seconds>,
        current_time  : <seconds>,
        evt : <event obj>
    },
}
*/

/* send out data to each channel every second */
setInterval(() =>
{
    for(obj in global.channels)
    {
        if(!obj.current_video) continue;

        ++obj.current_time;

        obj.evt.eventNames().forEach((connected_user) =>
        {
            if(obj.video_length - 1 <= obj.current_time)
            {
                obj.current_time = 0;
                // TODO: fetch next video and length from db
                // Replace obj.current_video and obj.video_length
                // Do not emit; emit in the next iteration
            }

            obj.evt.emit(connected_user, obj.current_video, obj.current_time);
        });
    }
}, 1000);


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
// TODO: Consider deleting captcha using a middleware :
// - if after n minutes or
// - if user visits non-captcha url

if(process.env.DEV && !process.env.TESTING) require('./middleware/debug.js')(app);

app.use(require('./controller/'));

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