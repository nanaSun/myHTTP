let http=require("http")
let response=require("./response")
let request=require("./request")
let context=require("./context")
class myhttp{
    constructor(){
        this.middleWares=[]
        this.context=Object.create(context)
        this.request=Object.create(request)
        this.response=Object.create(response)
    }
    use(callback){
        console.log(callback);
        this.middleWares.push(callback)
        return this;
    }
    createContext(req,res){
        let ctx=Object.create(this.context)
        let request=Object.create(this.request)
        let response=Object.create(this.response)
        ctx.request=request
        ctx.response=response
        ctx.request.req=ctx.req=req
        ctx.response.res=ctx.res=res
        return ctx
    }
    handleRequest(req,res){
        let ctx=this.createContext(req,res)
        this.middleWares.forEach(m=>{
            m(ctx)
        })
        res.end(ctx.body);
    }
    listen(...args){
        // 起一个服务
        let server = http.createServer(this.handleRequest.bind(this));
        server.listen(...args)
    }
}
module.exports=myhttp