import type {
  ProductCurrentImage,
  ProductEditorDraft,
} from "../../domain/types/product-editor.types"
import { createProductMockImage } from "./productMockMedia"

export type EditableProductMock = {
  fields: ProductEditorDraft["fields"]
  oldImages: ProductCurrentImage[]
  updatedAt: string
}

const mockProducts: Record<string, EditableProductMock> = {
  "101": {
    fields: {
      title: "Honda Vision 2024",
      price: "1250",
      description: "Xe đi ít, giấy tờ đầy đủ, máy êm và ngoại hình còn mới. Phù hợp đi lại hàng ngày hoặc mua cho sinh viên.",
      category: "vehicles",
      condition: "like-new",
      location: "Đà Nẵng",
      currency: "USD",
      stock: "2",
    },
    oldImages: [
      createProductMockImage("old-1", "Vision Front", 0),
      createProductMockImage("old-2", "Vision Side", 1),
      createProductMockImage("old-3", "Vision Detail", 2),
    ],
    updatedAt: "Cập nhật 2 giờ trước",
  },
  "202": {
    fields: {
      title: "Bộ nồi chiên không dầu 6L",
      price: "185",
      description: "Bộ nồi chiên còn đẹp, hoạt động ổn định, đầy đủ khay và phụ kiện. Phù hợp gia đình nhỏ và căn hộ.",
      category: "home",
      condition: "used",
      location: "TP. Hồ Chí Minh",
      currency: "USD",
      stock: "5",
    },
    oldImages: [
      createProductMockImage("old-1", "Air Fryer Main", 0),
      createProductMockImage("old-2", "Air Fryer Tray", 3),
    ],
    updatedAt: "Cập nhật hôm qua",
  },
}

const fallbackProduct: EditableProductMock = {
  fields: {
    title: "Sản phẩm demo đang chỉnh sửa",
    price: "89",
    description: "Đây là dữ liệu mẫu để kiểm tra flow sửa sản phẩm trong marketplace.",
    category: "tech",
    condition: "new",
    location: "Hà Nội",
    currency: "USD",
    stock: "3",
  },
  oldImages: [
    createProductMockImage("old-1", "Demo Main", 0),
    createProductMockImage("old-2", "Demo Secondary", 1),
  ],
  updatedAt: "Cập nhật gần đây",
}

export const getEditableProductById = (productId: string): EditableProductMock =>
  mockProducts[productId] ?? fallbackProduct
