
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { createOrderSchema, orderIdSchema } from "../validators.js";

const router = Router();

const orderInclude = {
  details: {
    include: {
      product: {
        select: {
          pid: true,
          pname: true,
        },
      },
    },
  },
  shipments: true,
};

router.use(authenticate);

// POST /api/orders
// Tạo đơn hàng, chi tiết đơn hàng, cập nhật tồn kho và tạo Shipment
router.post(
  "/",
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const { items } = req.validated.body;

    const order = await prisma.$transaction(
      async (transaction) => {
        // Kiểm tra các sản phẩm có tồn tại hay không
        const products = await transaction.product.findMany({
          where: {
            pid: {
              in: items.map(({ pid }) => pid),
            },
          },
        });

        if (products.length !== items.length) {
          throw new HttpError(
            400,
            "One or more products do not exist."
          );
        }

        // Tạo Map để tìm sản phẩm theo pid
        const productById = new Map(
          products.map((product) => [product.pid, product])
        );

        // Tạo đơn hàng
        const createdOrder = await transaction.order.create({
          data: {
            uid: req.user.uid,
          },
        });

        // Xử lý từng sản phẩm trong đơn hàng
        for (const item of items) {
          const product = productById.get(item.pid);

          // Kiểm tra tồn kho và trừ số lượng sản phẩm
          const stockUpdate = await transaction.product.updateMany({
            where: {
              pid: item.pid,
              quantity: {
                gte: item.qty,
              },
            },
            data: {
              quantity: {
                decrement: item.qty,
              },
            },
          });

          // Không đủ hàng thì hủy toàn bộ transaction
          if (stockUpdate.count !== 1) {
            throw new HttpError(
              409,
              `Insufficient stock for product ${item.pid}.`
            );
          }

          // Tạo chi tiết đơn hàng
          await transaction.orderDetail.create({
            data: {
              oid: createdOrder.oid,
              pid: product.pid,
              qty: item.qty,
              unit_price: product.price,
            },
          });
        }

        // Tạo một Shipment cho toàn bộ đơn hàng
        await transaction.shipment.create({
          data: {
            oid: createdOrder.oid,
            status: "pending",
          },
        });

        // Trả về đơn hàng kèm chi tiết và thông tin vận chuyển
        return transaction.order.findUnique({
          where: {
            oid: createdOrder.oid,
          },
          include: orderInclude,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    res.status(201).json({
      data: order,
    });
  })
);

// GET /api/orders
// Lấy danh sách đơn hàng của người dùng hiện tại
// Admin được xem tất cả đơn hàng
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where =
      req.user.role === "admin"
        ? {}
        : {
            uid: req.user.uid,
          };

    const orders = await prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: {
        createat: "desc",
      },
    });

    res.json({
      data: orders,
    });
  })
);

// GET /api/orders/:oid
// Xem chi tiết một đơn hàng
router.get(
  "/:oid",
  validate(orderIdSchema),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: {
        oid: req.validated.params.oid,
      },
      include: {
        ...orderInclude,
        user: {
          select: {
            uid: true,
            username: true,
          },
        },
      },
    });

    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Người dùng thường chỉ được xem đơn hàng của mình
    if (
      req.user.role !== "admin" &&
      order.uid !== req.user.uid
    ) {
      throw new HttpError(
        403,
        "You cannot access another user's order."
      );
    }

    res.json({
      data: order,
    });
  })
);

export default router;
