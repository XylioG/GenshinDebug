// {"retcode":0,"message":"OK","data":{"modified":true,"protocol":{"id":18,"app_id":4,"language":"es","user_proto":"","priv_proto":"","major":3,"minimum":0,"create_time":"0"}}}

module.exports = {
    execute(req, res) {
        var ret = {
            "retcode": 0,
            "message": "OK",
            "data": {
                "modified": true,
                "protocol": {
                    "id": 18,
                    "app_id": 4,
                    "language": "es",
                    "user_proto": "",
                    "priv_proto": "",
                    "major": 3,
                    "minimum": 0,
                    "create_time": "0"
                }
            }
        }
        res.end(JSON.stringify(ret));
    }
}
