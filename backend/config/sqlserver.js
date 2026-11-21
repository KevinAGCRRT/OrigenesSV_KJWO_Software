import { getConnection, mssql } from "./coneccionSQLserver.js"

const getProducts = async ()=> {
        try{
        const pool = await getConnection () //el pool de conecciones, es un contenedor de conecciones que se utilizan de manera independiente 
        const result = await pool.request().query("select* from sucursales ") //Nos permite hacer peticiones 
        console.log(result);
        console.log("productos listados");
    } 
    catch(error)
    { console.error(error);

    }};

getProducts();