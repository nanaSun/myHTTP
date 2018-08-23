let request={
    get url(){
        return this.req.url
    },
    get headers(){
        return this.req.headers
    }
}
module.exports=request