class Page{
    constructor(path,callback){
        this.path=path
        this.callback=callback
    }
}
class Router{
    constructor(){
        this.pages=[]
    }
    get(path,callback){
        this.pages.push(new Page(path,callback))
        return this
    }
    post(path,callback){
        this.pages.push(new Page(path,callback))
        return this
    }
    use(path,middleware) {
        let router = this;
        middleware.router.pages.forEach(p => {
            router.get(path+p.path,p.callback)
        });
        return router
    }
    compose(ctx,next,routers){
        async function dispatch(index){
            if(index===routers.length) return await next();
            let router=routers[index]
            await router(ctx,()=>dispatch(index+1));
        }
        return dispatch(0)
    }
    routes(){
        let dispatch = (ctx,next)=>{
            let path=ctx.path
            let routers=this.pages.filter(p=>{return p.path===path}).map(p=>p.callback)
            return this.compose(ctx,next,routers)
        }
        dispatch.router=this
        return dispatch
    }
}
module.exports=Router