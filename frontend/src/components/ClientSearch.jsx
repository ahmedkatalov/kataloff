import { useState } from "react";
import ContactSection from "./ContactSection.jsx";

export default function ClientSearch() {
  const [fio, setFio] = useState("");
  const [installmentNumber, setInstallmentNumber] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openIndexes, setOpenIndexes] = useState(new Set());

  const API_URL = import.meta.env.VITE_API_URL;
  const TOKEN = import.meta.env.VITE_API_TOKEN;

  // === НОРМАЛИЗАЦИЯ ПРОБЕЛОВ ===
  const normalizeWhitespace = (str) => {
    return str.replace(/\s+/g, " ").trim();
  };

  // === ПОИСК РАССРОЧКИ ===
  const searchInstallments = async () => {
    setLoading(true);
    setError("");
    setData(null);
    setOpenIndexes(new Set());

    try {
      const fioNormalized = normalizeWhitespace(fio);
      const numberNormalized = installmentNumber.trim();

      const url = `${API_URL}/installments/search?installment_number=${encodeURIComponent(
        numberNormalized
      )}&client_name=${encodeURIComponent(fioNormalized)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        let localizedError;
        if (res.status === 404) {
          localizedError =
            "Рассрочка не найдена. Проверьте номер рассрочки и ФИО клиента.";
        } else if (res.status === 400) {
          localizedError =
            "Неверные данные. Проверьте правильность введенной информации.";
        } else if (res.status === 401) {
          localizedError = "Ошибка авторизации. Обратитесь к администратору.";
        } else if (res.status === 500) {
          localizedError = "Ошибка сервера. Попробуйте позже.";
        } else {
          localizedError =
            "Не удалось получить данные. Проверьте введенную информацию.";
        }

        throw new Error(localizedError);
      }

      const json = await res.json();
      if (!json || !json.installments || json.installments.length === 0)
        throw new Error("Рассрочки не найдены для указанного клиента");

      setData(json);
    } catch (e) {
      setError(e.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  // === СТИЛИ ДЛЯ СТАТУСОВ ===
  const getStatusStyle = (status) => {
    const s = status.toLowerCase().trim();

    if (s.includes("оплач")) return "bg-green-50 text-green-500 border border-green-300";
    if (s.includes("просроч")) return "bg-red-50 text-red-400 border border-red-300";
    if (s.includes("к оплате")) return "bg-orange-50 text-orange-400 border border-orange-300";
    if (s.includes("предстоящ") || s.includes("текущ"))
      return "bg-blue-50 text-blue-400 border border-blue-300";

    return "bg-gray-50 text-gray-400 border border-gray-300";
  };

  const capitalizeFirst = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const getPaymentName = (payment, index) => {
    if (payment.payment_number === 0) return "Первый взнос";
    return `Месяц ${payment.payment_number}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("ru-RU").format(amount) + " ₽";
  };

  // === РАСЧЕТ СТАТУСА РАССРОЧКИ ===
  const getInstallmentStatus = (installment) => {
    if (!installment.payments || installment.payments.length === 0) {
      return installment.payment_status; // fallback to backend status
    }

    const today = new Date().toISOString().split("T")[0];
    
    // Check if all payments are paid
    const allPaid = installment.payments.every(payment => payment.is_paid);
    if (allPaid) {
      return "Оплачено";
    }

    // Check for overdue payments
    const hasOverdue = installment.payments.some(payment => 
      !payment.is_paid && new Date(payment.due_date) < new Date(today)
    );
    if (hasOverdue) {
      return "Просрочено";
    }

    // Check for payments due today
    const hasDueToday = installment.payments.some(payment =>
      !payment.is_paid && new Date(payment.due_date).toDateString() === new Date(today).toDateString()
    );
    if (hasDueToday) {
      return "К оплате";
    }

    // Otherwise it's upcoming
    return "Предстоящий";
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f6f7fb]">
      <div className="container mx-auto px-6 py-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-3xl font-semibold mb-2 text-[#223042]">
            Мои рассрочки
          </h1>
        </div>

        {/* SEARCH CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#223042] mb-4">
            Поиск рассрочек
          </h3>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input
              type="text"
              placeholder="Фамилия Имя Отчество"
              value={fio}
              onChange={(e) => setFio(e.target.value)}
              className="flex-1 p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#2d9f8a]"
            />

            <input
              type="number"
              placeholder="Номер рассрочки"
              value={installmentNumber}
              onChange={(e) => setInstallmentNumber(e.target.value)}
              className="flex-1 no-arrows p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#2d9f8a]"
            />

            <button
              onClick={searchInstallments}
              disabled={loading || !fio || !installmentNumber}
              className={`px-10 py-3 rounded-full font-semibold transition-all ${
                loading || !fio || !installmentNumber
                  ? "bg-gray-300 text-gray-500"
                  : "bg-gradient-to-r from-[#043c6f] to-[#5bc5a7] text-white hover:scale-105"
              }`}
            >
              {loading ? "Поиск..." : "Найти"}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* ===== PART 2 — вставляй следующую часть сюда */}

        {/* Client Info Card */}
        {/* CLIENT INFO CARD */}
        {data && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#223042] mb-4">
              Информация о клиенте
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-15 gap-6 text-sm">
              <div className="flex flex-col md:col-span-5">
                <span className="text-gray-500">Имя:</span>
                <span className="font-semibold text-[#223042] text-base">
                  {data.client.name}
                </span>
              </div>

              <div className="flex flex-col md:col-span-2">
                <span className="text-gray-500">Найденная рассрочка:</span>
                <span className="font-semibold text-[#223042] text-base">
                  № {data.client.searched_installment_number}
                </span>
              </div>

              <div className="flex flex-col md:col-span-2">
                <span className="text-gray-500">Всего рассрочек:</span>
                <span className="font-semibold text-[#223042] text-base">
                  {data.summary.total_installments}
                </span>
              </div>

              <div className="flex flex-col md:col-span-2">
                <span className="text-gray-500">Оплачено:</span>
                <span className="font-semibold text-[#223042] text-base">
                  {formatCurrency(data.summary.total_paid)}
                </span>
              </div>

              <div className="flex flex-col md:col-span-2">
                <span className="text-gray-500">Остаток:</span>
                <span className="font-semibold text-[#223042] text-base">
                  {formatCurrency(data.summary.total_remaining)}
                </span>
              </div>

              <div className="flex flex-col md:col-span-2">
                <span className="text-gray-500">Просрочено:</span>
                <span className="font-semibold text-[#223042] text-base">
                  {formatCurrency(data.summary.total_overdue)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* INSTALLMENT CARDS */}
        {data &&
          data.installments &&
          Array.isArray(data.installments) &&
          data.installments.map((inst, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-4"
            >
              {/* DESKTOP HEADER */}
              <div className="hidden md:block">
                <div
                  onClick={() => {
                    const newSet = new Set(openIndexes);
                    newSet.has(i) ? newSet.delete(i) : newSet.add(i);
                    setOpenIndexes(newSet);
                  }}
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors rounded-2xl"
                >
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-[#223042] mb-1">
                      {inst.product_name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between w-full max-w-2xl text-sm">
                    <div className="text-left">
                      <div className="font-semibold text-[#223042]">
                        № {inst.installment_number}
                      </div>
                      <div className="text-gray-500">Договор</div>
                    </div>

                    <div className="text-left">
                      <div className="font-semibold text-[#223042]">
                        {inst.term_months} мес.
                      </div>
                      <div className="text-gray-500">Срок</div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-[#223042]">
                        {formatCurrency(inst.installment_price)}
                      </div>
                      <div className="text-gray-500">Стоимость</div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-[#223042]">
                        {formatCurrency(inst.remaining_amount)}
                      </div>
                      <div className="text-gray-500">Остаток</div>
                    </div>

                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-normal w-28 text-center ${getStatusStyle(
                        getInstallmentStatus(inst)
                      )}`}
                    >
                      {capitalizeFirst(getInstallmentStatus(inst))}
                    </span>

                    <div className="text-[#2d9f8a]">
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          openIndexes.has(i) ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* MOBILE HEADER */}
              <div className="md:hidden">
                <div
                  onClick={() => {
                    const newSet = new Set(openIndexes);
                    newSet.has(i) ? newSet.delete(i) : newSet.add(i);
                    setOpenIndexes(newSet);
                  }}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-2xl"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-[#223042] flex-1 pr-4">
                      {inst.product_name}
                    </h4>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-normal ${getStatusStyle(
                          getInstallmentStatus(inst)
                        )}`}
                      >
                        {capitalizeFirst(getInstallmentStatus(inst))}
                      </span>

                      <svg
                        className={`w-5 h-5 text-[#2d9f8a] transition-transform ${
                          openIndexes.has(i) ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Договор:</span>
                      <span className="font-semibold text-[#223042] ml-1">
                        № {inst.installment_number}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500">Срок:</span>
                      <span className="font-semibold text-[#223042] ml-1">
                        {inst.term_months} мес.
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500">Стоимость:</span>
                      <span className="font-semibold text-[#223042] ml-1">
                        {formatCurrency(inst.installment_price)}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500">Остаток:</span>
                      <span className="font-semibold text-[#223042] ml-1">
                        {formatCurrency(inst.remaining_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

        {/* ===== PART 3 — вставляй следующую часть */}


              {/* PAYMENTS LIST */}
              {openIndexes.has(i) && inst.payments && (
                <div className="border-t border-gray-200">
                  
                  {/* DESKTOP PAYMENTS */}
                  <div className="hidden md:block p-6">
                    <h5 className="font-semibold text-[#223042] mb-4">
                      График платежей
                    </h5>

                    <div className="space-y-3">
                      {inst.payments.map((payment, j) => {
                        const today = new Date().toISOString().split("T")[0];

                        let status = payment.is_paid
                          ? "Оплачено"
                          : new Date(payment.due_date) < new Date(today)
                          ? "Просрочено"
                          : new Date(payment.due_date).toDateString() ===
                            new Date(today).toDateString()
                          ? "К оплате"
                          : "Предстоящий";

                        const displayAmount =
                          payment.is_paid && payment.paid_amount
                            ? payment.paid_amount
                            : payment.expected_amount;

                        return (
                          <div
                            key={j}
                            className="bg-gray-50 rounded-xl p-4"
                          >
                            <div className="flex items-center justify-between text-sm w-full">

                              <div className="text-left">
                                <div className="font-semibold text-[#223042]">
                                  {getPaymentName(payment, j)}
                                </div>
                              </div>

                              <div className="text-left">
                                <div className="font-semibold text-[#223042]">
                                  {formatDate(payment.due_date)}
                                </div>
                                <div className="text-gray-500">
                                  Срок оплаты
                                </div>
                              </div>

                              <div className="text-left">
                                <div className="font-semibold text-[#223042]">
                                  {formatCurrency(displayAmount)}
                                </div>
                                <div className="text-gray-500">
                                  {payment.is_paid ? "Оплачено" : "Сумма"}
                                </div>
                              </div>

                              <span
                                className={`px-3 py-1.5 rounded-full text-xs font-normal w-28 text-center ${getStatusStyle(
                                  status
                                )}`}
                              >
                                {status}
                              </span>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* MOBILE PAYMENTS */}
                  <div className="md:hidden p-4">
                    <h5 className="font-semibold text-[#223042] mb-4">
                      График платежей
                    </h5>

                    <div className="space-y-3">
                      {inst.payments.map((payment, j) => {
                        const today = new Date().toISOString().split("T")[0];

                        let status = payment.is_paid
                          ? "Оплачено"
                          : new Date(payment.due_date) < new Date(today)
                          ? "Просрочено"
                          : new Date(payment.due_date).toDateString() ===
                            new Date(today).toDateString()
                          ? "К оплате"
                          : "Предстоящий";

                        const displayAmount =
                          payment.is_paid && payment.paid_amount
                            ? payment.paid_amount
                            : payment.expected_amount;

                        return (
                          <div
                            key={j}
                            className="bg-gray-50 rounded-xl p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="font-semibold text-[#223042]">
                                {getPaymentName(payment, j)}
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-normal ${getStatusStyle(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">
                                  Срок оплаты:
                                </span>
                                <div className="font-semibold text-[#223042]">
                                  {formatDate(payment.due_date)}
                                </div>
                              </div>

                              <div>
                                <span className="text-gray-500">
                                  {payment.is_paid
                                    ? "Оплачено:"
                                    : "Сумма:"}
                                </span>
                                <div className="font-semibold text-[#223042]">
                                  {formatCurrency(displayAmount)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>
          ))}

      </div>

      <ContactSection />
    </div>
  );
}
