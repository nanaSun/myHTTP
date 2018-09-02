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
    compose(ctx,middlewares){
        async function dispatch(index){
            if(index===middlewares.length) return;
            let fn=middlewares[index]
            await fn(ctx,()=>dispatch(index+1));
        }
        return dispatch(0)
    }
    //处理server返回的req和res
    handleRequest(req,res){
        // 创建上下文，链接http的req和res
        let ctx=this.createContext(req,res)
        // 组合执行所有函数
        let r=this.compose(ctx,this.middleWares)
        r.then((err,data)=>{
            res.end(ctx.body)
        })
        
    }
    listen(...args){
        // 起一个服务
        let server = http.createServer(this.handleRequest.bind(this));
        server.listen(...args)
    }
}
module.exports=myhttp