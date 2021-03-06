
const ProductUtils = require('../../utils/product.utils');
const Customer = require('../../models/customers.model')
const Bill = require('../../models/bill.model')
const BillDetail = require('../../models/bill-detail.model')
const Product = require('../../models/product.model')
const Promotion = require('../../models/promotion.model')
import {STAFF} from '../../utils/constanst'

exports.listProduct = async (req, res, next) => {

    try {
        if(req.user.typeUser == STAFF) {
            const products = await ProductUtils.getList();
            return res.render('staff/payment', { title: 'Bán hàng', products });
        } 
        return res.redirect("/");
        
    } catch (err) {
        console.log("err: ", err.message)
        return res.status(500).render('staff/payment', { title: 'Bán hàng', products: [] });
    }
}

exports.createBill = async (req, res, next) => {
    try {

        const { customer, products, total } = req.body
        let newCustomer = {};
        let score = 0;
        console.log(total)
        if (total > 2000000) {
            score += 15;
        } else if (total > 1000000) {
            score += 10;
        } else if (total > 500000) {
            score += 5;
        } else {
            score = 1;
        }
        if (customer.phone !== '') {
            const data = await Customer.findOneAndUpdate({ phone: customer.phone }, {
                $inc: { score: +score }
            })
            if (!data) {
                const _customer = new Customer(Object.assign(customer, { score: +score }))
                newCustomer = await _customer.save()
            }
        }

        const bill = new Bill({
            date: new Date(),
            idCustomer: newCustomer ? newCustomer._id : null,
            total,
        })
        const newBill = await bill.save()

        for (const item of products) {
            const billDetail = new BillDetail({
                idBill: newBill._id,
                idProduct: item._id,
                quantity: item.quantity,
                price: parseInt(item.quantity) * item.price
            })
            await billDetail.save()
            await Product.findOneAndUpdate({ _id: item._id }, { $inc: { quantity: -item.quantity } }, { new: true })
        }

        const listProduct = await ProductUtils.getList()
        res.status(200).send({ isSuccess: true, message: "Thanh toán thành công", products: listProduct });
    } catch (err) {
        console.log("err: ", err.message)
        res.status(500).send({ isSuccess: false, message: "Thanh toán thất bại" });
    }
}

exports.getListSearch = async (req, res, next) => {

    try {
        const { text } = req.query
        const products = await Product.find({ name: { '$regex': text, '$options': 'i' } })
            .populate('idOrigin')
            .populate('idTypeProduct')

        res.status(200).send({ products });
    } catch (err) {
        console.log("err: ", err.message)
        res.status(500).send({ products: [] });
    }
}

exports.getCusomterByPhone = async (req, res) => {
    try {
        const { phone } = req.query
        const customer = await Customer.findOne({ phone })
        console.log(customer)
        let promotion = []
        if(customer){
            promotion = await Promotion.find({minScore: { $lte: parseInt(customer.score)}, isDelete: false, dateTo: { $gte: new Date()}}).sort({discount: -1}).limit(1)
        }
        console.log(promotion)
        res.status(200).send({ customer, promotion });
    } catch (err) {
        console.log("err: ", err.message)
        res.status(500).send({ customer: [] });
    }
}

exports.deleteTest = async (req, res) => {
    console.log('object')
    await Bill.deleteMany()
    await BillDetail.deleteMany()
    await Customer.deleteMany()
    res.status(200).json({ message: "đã xóa" })
}