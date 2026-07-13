import { api } from "./api.js";

export const subjectService = {
  async getAll() {
    const { data } = await api.get("/subjects");
    return data.data?.subjects || [];
  },

  async create({ name, code, department, year }) {
    const { data } = await api.post("/subjects", { name, code, department, year });
    return data.data.subject;
  },

  async update(id, payload) {
    const { data } = await api.put(`/subjects/${id}`, payload);
    return data.data.subject;
  },

  async delete(id) {
    await api.delete(`/subjects/${id}`);
  },
};
