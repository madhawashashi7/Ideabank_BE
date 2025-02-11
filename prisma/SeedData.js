import { PrismaClient } from "@prisma/client"; 

const prisma = new PrismaClient();

const categories = [
    {catName: "Renewable energy"},
    {catName: "Urban development"},
    {catName: "Environmental policy"}
];


const countries = [
    {countryName: "Sri Lanka"},
    {countryName: "United Nation"},
    {countryName: "United kingdom"}
]

const roles = [
    {role: "SysAdmin"},
    {role: "Admin"},
    {role: "Manager"},
    {role: "Staff"}
]
 

async function seedDataAsync() {
    await prisma.ideaCategory.deleteMany();
    await prisma.country.deleteMany();
    await prisma.role.deleteMany();

    for(const category of categories){
        await prisma.ideaCategory.create({data: category})
    }

    for(const country of countries){
        await prisma.country.create({data: country})
    }

    for(const rol of roles){
        await prisma.role.create({data: rol})
    }  
}
 

seedDataAsync();