let myhttp=require("./application")
let app= new myhttp()
app.use(ctx=>{
    console.log(1)
}).use(ctx=>{
    console.log(2)
})
app.use(ctx=>{
    console.log(3)
})
app.listen(3000)