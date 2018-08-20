const URL=require("url")
let request={
    get url(){
        return this.req.url
    },
    get path(){
        return URL.parse(this.req.url)
    },
    get query(){
        return URL.parse(this.req.url,true)
    },
    get headers(){
        return this.req.headers
    }
}
module.exports =  request