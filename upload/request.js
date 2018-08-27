const url=require('url')
let request={
    get url(){
        return this.req.url
    },
    get headers(){
        return this.req.headers
    },
    get path(){
        let {pathname} = url.parse(this.req.url);
        return pathname
    },
    get query(){
        let { query } = url.parse(this.req.url,true);
        return query
    }
}
module.exports=request