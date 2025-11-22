import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { sendCalc, getWhatsAppNumber } from "../lib/api.js";
import ModalForm from "./ModalForm.jsx";
import ContactSection from "./ContactSection.jsx";

/** ===== палитра ===== */
const LOGO_BLUE = "#043c6f";
const LOGO_BLUE_HOVER = "#032f5a";
const LOGO_GREEN = "#5bc5a7";
const LOGO_MID = "#2d9f8a";
const INFO_BLUE = "#42A5F5";
const INFO_BLUE_BG = "#E3F2FD";

/** ===== утилиты ===== */
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const toNumber = (v) => {
  const n = Number(String(v).replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fmtRub =
  (n) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(
      Number.isFinite(n) ? n : 0
    ) + " ₽";

/** ======================= КАЛЬКУЛЯТОР ======================= */
export default function Calculator() {
  /* переключатели */
  const [hasGuarantor, setHasGuarantor] = useState(false);
  const [hasDown, setHasDown] = useState(false);

  /* уведомление */
  const [notify, setNotify] = useState("");
  const notifyTimeoutRef = useRef(null);

  const showNotify = useCallback((msg) => {
    setNotify(msg);
    if (notifyTimeoutRef.current) clearTimeout(notifyTimeoutRef.current);
    // 4.6 секунды показа
    notifyTimeoutRef.current = setTimeout(() => setNotify(""), 4600);
  }, []);

  /* таймер проверки взноса */
  const downTimeoutRef = useRef(null);

  const scheduleDownValidation = (callback) => {
    if (downTimeoutRef.current) clearTimeout(downTimeoutRef.current);
    downTimeoutRef.current = setTimeout(callback, 3000); // 3 сек после ввода
  };

  /* динамический потолок цены */
  const maxPrice = useMemo(() => {
    if (hasGuarantor && hasDown) return 200_000;
    if (hasGuarantor) return 100_000;
    return 70_000;
  }, [hasGuarantor, hasDown]);

  /* динамический максимум срока */
  const maxTerm = useMemo(() => {
    if (hasGuarantor && hasDown) return 12;
    if (hasGuarantor) return 10;
    return 8;
  }, [hasGuarantor, hasDown]);

  /* стоимость */
  const [price, setPrice] = useState(50_000);
  const [priceInputValue, setPriceInputValue] = useState("50 000");

  /* срок */
  const [term, setTerm] = useState(3);
  const [termInputValue, setTermInputValue] = useState("3");

  /* первый взнос */
  const [downPayment, setDownPayment] = useState(0);
  const [downInputValue, setDownInputValue] = useState("0");
  const [downPercent, setDownPercent] = useState(0);

  // refs для корректной работы таймера проверки
  const priceRef = useRef(price);
  const downPaymentRef = useRef(downPayment);

  useEffect(() => {
    priceRef.current = price;
  }, [price]);

  useEffect(() => {
    downPaymentRef.current = downPayment;
  }, [downPayment]);

  /* расчёт/WA */
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wa, setWa] = useState("");
  const lastReqId = useRef(0);

  /* модалка «Оформить» */
  const [modalOpen, setModalOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [productName, setProductName] = useState("");

  /** ===== очистка таймеров при размонтировании ===== */
  useEffect(() => {
    return () => {
      if (downTimeoutRef.current) clearTimeout(downTimeoutRef.current);
      if (notifyTimeoutRef.current) clearTimeout(notifyTimeoutRef.current);
    };
  }, []);

  /** ===== загрузка WA ===== */
  useEffect(() => {
    getWhatsAppNumber().then(setWa).catch(() => {});
  }, []);

  /** ===== проценты взноса (живые) ===== */
  useEffect(() => {
    if (!hasDown || price <= 0) {
      setDownPercent(0);
    } else {
      setDownPercent(clamp(Math.round((downPayment / price) * 100), 0, 100));
    }
  }, [hasDown, price, downPayment]);

  /** ===== авто-коррекция ограничений ===== */
  useEffect(() => {
    if (price > maxPrice) {
      setPrice(maxPrice);
      setPriceInputValue(new Intl.NumberFormat("ru-RU").format(maxPrice));
    }
    if (downPayment > price) {
      setDownPayment(price);
      setDownInputValue(new Intl.NumberFormat("ru-RU").format(price));
    }
    if (term > maxTerm) {
      setTerm(maxTerm);
      setTermInputValue(maxTerm.toString());
    }
  }, [maxPrice, maxTerm, price, downPayment, term]);

  /** ===== обработчики стоимости ===== */
  const handlePriceInput = (val) => {
    const clean = val.replace(/[^0-9]/g, "");

    if (clean === "") {
      setPriceInputValue("");
      setPrice(5000);
      
      // Update down payment if enabled
      if (hasDown) {
        const minDown = Math.round(5000 * 0.2);
        setDownPayment(minDown);
        setDownInputValue(new Intl.NumberFormat("ru-RU").format(minDown));
        setDownPercent(20);
      }
      return;
    }

    setPriceInputValue(clean);
    const num = Number(clean);
    setPrice(num);
    
    // Auto-adjust down payment if enabled
    if (hasDown && num > 0) {
      const minDown = Math.round(num * 0.2);
      // Only update if current down payment is less than new minimum
      if (downPaymentRef.current < minDown) {
        setDownPayment(minDown);
        setDownInputValue(new Intl.NumberFormat("ru-RU").format(minDown));
        setDownPercent(20);
      } else {
        // Update percentage based on current down payment amount
        const newPercent = Math.round((downPaymentRef.current / num) * 100);
        setDownPercent(Math.min(newPercent, 100));
      }
    }
  };

  const handlePriceBlur = () => {
    if (priceInputValue === "" || priceInputValue === "0") {
      setPriceInputValue("5 000");
      setPrice(5000);
      
      // Update down payment if enabled
      if (hasDown) {
        const minDown = Math.round(5000 * 0.2);
        setDownPayment(minDown);
        setDownInputValue(new Intl.NumberFormat("ru-RU").format(minDown));
        setDownPercent(20);
      }
      return;
    }

    const num = Number(priceInputValue.replace(/\s/g, ""));
    
    // Handle invalid numbers or ensure within bounds
    let clamped;
    if (isNaN(num) || num <= 0) {
      clamped = 5000;
    } else if (num < 5000) {
      clamped = 5000;
    } else if (num > maxPrice) {
      clamped = maxPrice;
    } else {
      clamped = num;
    }
    
    const formatted = new Intl.NumberFormat("ru-RU").format(clamped);

    setPrice(clamped);
    setPriceInputValue(formatted);

    // Auto-adjust down payment if enabled
    if (hasDown) {
      const minDown = Math.round(clamped * 0.2);
      // Always ensure down payment meets minimum requirement
      if (downPaymentRef.current < minDown) {
        setDownPayment(minDown);
        setDownInputValue(new Intl.NumberFormat("ru-RU").format(minDown));
        setDownPercent(20);
      } else {
        // Update percentage based on current down payment amount
        const newPercent = Math.round((downPaymentRef.current / clamped) * 100);
        setDownPercent(Math.min(newPercent, 100));
      }
    }
  };

  const handlePriceSlider = (val) => {
    const n = Number(val);
    setPrice(n);
    setPriceInputValue(new Intl.NumberFormat("ru-RU").format(n));

    // Auto-adjust down payment if enabled
    if (hasDown) {
      const minDown = Math.round(n * 0.2);
      // Always ensure down payment meets minimum requirement
      if (downPaymentRef.current < minDown) {
        setDownPayment(minDown);
        setDownInputValue(new Intl.NumberFormat("ru-RU").format(minDown));
        setDownPercent(20);
      } else {
        // Update percentage based on current down payment amount
        const newPercent = Math.round((downPaymentRef.current / n) * 100);
        setDownPercent(Math.min(newPercent, 100));
      }
    }
  };

  /** ===== обработчики срока ===== */
  const handleTermInput = (val) => {
    const clean = val.replace(/[^0-9]/g, "");
    setTermInputValue(clean);

    if (clean === "") {
      setTerm(3); // Default to minimum when empty
      return;
    }

    const num = Number(clean);
    // Allow any value during typing, validation will catch invalid ones
    setTerm(num);
  };

  const handleTermBlur = () => {
    if (termInputValue === "" || termInputValue === "0") {
      setTerm(3);
      setTermInputValue("3");
      return;
    }

    let num = Number(termInputValue);

    // Clamp to valid range on blur
    if (isNaN(num) || num <= 0) {
      num = 3;
    } else if (num < 3) {
      num = 3;
    } else if (num > maxTerm) {
      num = maxTerm;
    }

    setTerm(num);
    setTermInputValue(String(num));
  };

  const handleTermSlider = (val) => {
    const n = Number(val);
    setTerm(n);
    setTermInputValue(n.toString());
  };



  /** ===== обработчики взноса (₽) ===== */
  const handleDownInput = (val) => {
    if (!hasDown) return;

    const clean = val.replace(/[^0-9]/g, "");
    setDownInputValue(clean);

    if (clean !== "") {
      const amount = Number(clean);
      const minDown = Math.round(priceRef.current * 0.2);
      const maxDown = priceRef.current;
      
      // Allow typing but enforce limits
      setDownPayment(amount);
    }
  };

  const handleDownBlur = () => {
    if (!hasDown) return;

    const amount = Number(downInputValue.replace(/\s/g, ""));
    const minDown = Math.round(priceRef.current * 0.2);
    const maxDown = priceRef.current;

    let clamped;
    if (isNaN(amount) || amount <= 0) {
      clamped = minDown;
    } else if (amount < minDown) {
      clamped = minDown;
    } else if (amount > maxDown) {
      clamped = maxDown;
    } else {
      clamped = amount;
    }

    setDownPayment(clamped);
    setDownInputValue(new Intl.NumberFormat("ru-RU").format(clamped));
    setDownPercent(Math.round((clamped / priceRef.current) * 100));
  };

  /** ===== обработчик процентов (%) ===== */
  const handleDownPercentInput = (val) => {
    if (!hasDown) return;

    const clean = val.replace(/[^0-9]/g, "");
    setDownPercent(clean);

    if (clean !== "") {
      const p = Number(clean);
      const rub = Math.round((priceRef.current * p) / 100);
      setDownPayment(rub);
      setDownInputValue(new Intl.NumberFormat("ru-RU").format(rub));
    }
  };

  const handleDownPercentBlur = () => {
    if (!hasDown) return;

    const percent = Number(downPercent);
    
    let clamped;
    if (isNaN(percent) || percent <= 0) {
      clamped = 20;
    } else if (percent < 20) {
      clamped = 20;
    } else if (percent > 100) {
      clamped = 100;
    } else {
      clamped = percent;
    }

    setDownPercent(clamped);
    const rub = Math.round((priceRef.current * clamped) / 100);
    setDownPayment(rub);
    setDownInputValue(new Intl.NumberFormat("ru-RU").format(rub));
  };

  /** ===== переключатели ===== */
  const handleGuarantorChange = (checked) => {
    setHasGuarantor(checked);
  };

  const handleDownToggle = (checked) => {
    setHasDown(checked);
    if (!checked) {
      setDownPayment(0);
      setDownInputValue("0");
      setDownPercent(0);
      if (downTimeoutRef.current) clearTimeout(downTimeoutRef.current);
    } else {
      const minDown = Math.round(priceRef.current * 0.2);
      setDownPayment(minDown);
      setDownInputValue(new Intl.NumberFormat("ru-RU").format(minDown));
      setDownPercent(20);
    }
  };

  /** ===== запрос расчёта ===== */
  const doCalc = useCallback(async () => {
    const reqId = ++lastReqId.current;
    setError("");
    setLoading(true);
    try {
      const payload = {
        productName,
        price,
        term,
        hasGuarantor,
        hasDown,
        downPercent,
      };

      const [res] = await Promise.all([
        sendCalc(payload),
        new Promise((resolve) => setTimeout(resolve, 300)),
      ]);

      if (reqId === lastReqId.current) {
        setData(res);
        setLoading(false);
      }
    } catch (e) {
      if (reqId === lastReqId.current) {
        setError(e?.message || "Ошибка расчёта");
        setData(null);
        setLoading(false);
      }
    }
  }, [productName, price, term, hasGuarantor, hasDown, downPercent]);

  useEffect(() => {
    doCalc();
  }, [doCalc]);

  /** ===== инициализация слайдеров ===== */
  const updateSliderFill = (slider, value, min, max) => {
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, ${LOGO_MID} 0%, ${LOGO_MID} ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
  };

  useEffect(() => {
    const sliders = document.querySelectorAll(".sber-range");
    sliders.forEach((slider) => {
      const value = slider.value;
      const min = slider.min;
      const max = slider.max;
      updateSliderFill(slider, value, min, max);
    });
  }, [price, term, downPayment, maxPrice, maxTerm]);

  /** ===== ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ ===== */
  const validateInputs = () => {
    const errors = [];
    
    // Проверка цены
    if (price < 5000) {
      errors.push("Минимальная стоимость товара — 5 000 ₽");
    }
    if (price > maxPrice) {
      errors.push(`Максимальная стоимость товара — ${fmtRub(maxPrice)}`);
    }
    
    // Проверка срока
    if (term < 3) {
      errors.push("Минимальный срок рассрочки — 3 месяца");
    }
    if (term > maxTerm) {
      errors.push(`Максимальный срок рассрочки — ${maxTerm} месяцев`);
    }
    
    // Проверка первого взноса (если включен)
    if (hasDown) {
      const minDown = Math.round(price * 0.2);
      if (downPayment < minDown) {
        errors.push("Минимальный первый взнос — 20% от стоимости");
      }
      if (downPayment > price) {
        errors.push("Первый взнос не может превышать стоимость товара");
      }
    }
    
    return errors;
  };

  const inputErrors = validateInputs();
  const hasValidationErrors = inputErrors.length > 0;

  /** ===== вычисления для карточки ===== */
  const monthlyOverpay = useMemo(() => {
    if (!data) return 0;
    const monthlyMarkup = Number(data.totalMarkup) / (term || 1);
    return monthlyMarkup;
  }, [data, term]);

  /** ===== отправка WA ===== */
  const sendWA = () => {
    if (!data) return alert("Сначала рассчитайте рассрочку");
    if (!clientName || !productName)
      return alert("Введите данные в форме заявки");
    const msg = [
      " *Новая заявка на рассрочку*",
      ` *Имя клиента:* ${clientName}`,
      ` *Товар:* ${productName}`,
      ` *Стоимость товара:* ${fmtRub(price)}`,
      `*Первоначальный взнос:* ${hasDown ? fmtRub(downPayment) : "Нет"}`,
      ` *Срок:* ${term} мес.`,
      ` *Поручитель:* ${hasGuarantor ? "Есть" : "Нет"}`,
      "",
      ` *Ежемесячный платёж:* ${fmtRub(data.monthlyPayment)}`,
      ` *Общая сумма рассрочки:* ${fmtRub(data.total)}`,
    ].join("\n");
    window.open(
      `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
    setModalOpen(false);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f6f7fb]">

      {/* ===== NOTIFY (общий для месяцев и взноса) ===== */}
      {notify && (
        <div
          className="
            fixed top-4 left-1/2 -translate-x-1/2
            bg-white text-[#223042]
            px-4 py-3
            rounded-xl shadow-xl
            font-medium text-center
            z-[9999]
            animate-toastIn
            w-[90%] max-w-[360px]
          "
        >
          {notify}
          <div className="w-full h-1 bg-gray-200 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-[#e60606] animate-toastProgress"></div>
          </div>
        </div>
      )}

      <style>{`
        .sber-range {
          -webkit-appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 9999px;
          background: #e5e7eb;
          outline: none;
          position: relative;
        }

        .sber-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${LOGO_MID};
          border: 3px solid white;
          box-shadow: 0 0 0 1px ${LOGO_MID};
          cursor: pointer;
          position: relative;
        }
        .sber-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${LOGO_MID};
          border: 3px solid white;
          box-shadow: 0 0 0 1px ${LOGO_MID};
          cursor: pointer;
          transform: translateY(-50%);
        }
        .sber-range.marks-4 {
          background-image:
            linear-gradient(#e5e7eb,#e5e7eb),
            repeating-linear-gradient(to right, transparent, transparent calc(25% - 1px), #d1d5db 0, #d1d5db calc(25% + 1px));
          background-size: 100% 8px, 100% 2px;
          background-position: 0 0, 0 6px;
          background-repeat: no-repeat;
        }
        .pill {
          background: #f4f6f8;
          border: 1px solid #d6dbe0;
          border-radius: 14px;
          padding: 10px 14px;
          min-width: 130px;
          text-align: center;
          font-weight: 600;
          color: #223042;
        }
        .pill-input {
          background: #f4f6f8;
          border: 1px solid #d6dbe0;
          border-radius: 14px;
          padding: 10px 14px;
          min-width: 130px;
          text-align: center;
          font-weight: 600;
          color: #223042;
          outline: none;
        }
        .pill-input:focus {
          border-color: ${LOGO_MID};
          box-shadow: 0 0 0 2px ${LOGO_MID}33;
        }
        .pill-input-percent {
          background: #f4f6f8;
          border: 1px solid #d6dbe0;
          border-radius: 14px;
          padding: 10px 14px;
          text-align: center;
          font-weight: 600;
          color: #223042;
          outline: none;
          -moz-appearance: textfield;
        }
        .pill-input-percent::-webkit-outer-spin-button,
        .pill-input-percent::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .pill-input-percent:focus {
          border-color: ${LOGO_MID};
          box-shadow: 0 0 0 2px ${LOGO_MID}33;
        }
        .pill-input:disabled,
        .pill-input[readonly] {
          background: #f4f6f8;
          color: #223042;
          cursor: default;
          opacity: 1;
        }
        .pill-input-percent:disabled,
        .pill-input-percent[readonly] {
          background: #f4f6f8;
          color: #223042;
          cursor: default;
          opacity: 1;
        }
        .pill-input-percent-small {
          background: #f4f6f8;
          border: 1px solid #d6dbe0;
          border-radius: 14px;
          padding: 10px 14px;
          min-width: 85px;
          text-align: center;
          font-weight: 600;
          color: #223042;
          outline: none;
          -moz-appearance: textfield;
        }
        .pill-input-percent-small::-webkit-outer-spin-button,
        .pill-input-percent-small::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .pill-input-percent-small:focus {
          border-color: ${LOGO_MID};
          box-shadow: 0 0 0 2px ${LOGO_MID}33;
        }
        .pill-input-percent-small:disabled,
        .pill-input-percent-small[readonly] {
          background: #f4f6f8;
          color: #223042;
          cursor: default;
          opacity: 1;
        }
        .option-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          height: 48px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: white;
          color: ${LOGO_MID};
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
          text-align: center;
          font-size: 14px;
        }
        @media (min-width: 768px) {
          .option-button {
            gap: 8px;
            padding: 12px 20px;
            font-size: 16px;
          }
        }
        .option-button:hover {
          border-color: #d1d5db;
        }
        .option-button.active {
          background: linear-gradient(135deg, ${LOGO_BLUE} 0%, ${LOGO_GREEN} 100%);
          color: white;
          border-color: ${LOGO_MID};
        }
        .section-disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        .section-disabled .sбер-range::-webkit-slider-thumb {
          opacity: 0.5;
        }
        .section-disabled .sбер-range::-moz-range-thumb {
          opacity: 0.5;
        }
        @media (min-width: 768px) {
          .input-fixed-desktop {
            width: 224px !important;
          }
          .container-fixed-desktop {
            width: 224px !important;
          }
        }
      `}</style>

      <div className="container mx-auto px-6 py-4">
        {/* заголовок */}
        <div className="mb-6">
          <h1
            className="text-3xl md:text-3xl font-semibold mb-2"
            style={{ color: "#223042" }}
          >
            Калькулятор рассрочки
          </h1>
        </div>

        {/* карточка с подсказкой - только на мобильных */}
        <div className="lg:hidden mb-6">
            <div
              className="rounded-2xl border p-4"
              style={{ backgroundColor: INFO_BLUE_BG, borderColor: INFO_BLUE }}
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: INFO_BLUE }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: INFO_BLUE }}
                >
                  <p>
                    Без поручителя — до <b>70 000 ₽</b>
                    <br />
                    С поручителем — до <b>100 000 ₽</b>
                    <br />
                    С поручителем и первым взносом — до <b>200 000 ₽</b>
                  </p>
                </div>
              </div>
            </div>
        </div>

        {/* селекторы опций */}
        <div className="grid grid-cols-2 gap-3 mb-8 sm:flex sm:flex-wrap">
          <button
            onClick={() => handleDownToggle(!hasDown)}
            className={`option-button ${hasDown ? "active" : ""}`}
          >
            <span style={{ fontSize: "20px", fontWeight: "300" }}>₽</span>
            Первый взнос
          </button>
          <button
            onClick={() => handleGuarantorChange(!hasGuarantor)}
            className={`option-button ${hasGuarantor ? "active" : ""}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Поручитель
          </button>
        </div>

        {/* две колонки: слева контролы, справа карточка */}
        <div className="grid lg:grid-cols-[3fr_2fr] gap-6">
          {/* левая часть */}
          <div className="space-y-18">
            {/* Стоимость */}
            <section>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#223042] mb-2 md:mb-0">
                  Стоимость товара
                </h3>

                <input
                  type="text"
                  value={priceInputValue}
                  onFocus={() => {
                    if (priceInputValue === "5000" || priceInputValue === "5 000" || priceInputValue === "5 000 ₽") {
                      setPriceInputValue("");
                    }
                  }}
                  onChange={(e) => handlePriceInput(e.target.value)}
                  onBlur={handlePriceBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handlePriceBlur();
                      e.target.blur();
                    }
                  }}
                  className="pill-input w-full input-fixed-desktop"
                  placeholder=""
                />
              </div>

              <div className="mb-4">
                <input
                  className="sber-range marks-4"
                  type="range"
                  min={5000}
                  max={maxPrice}
                  step={1000}
                  value={clamp(price, 5000, maxPrice)}
                  onChange={(e) => {
                    handlePriceSlider(e.target.value);
                    updateSliderFill(e.target, e.target.value, 5000, maxPrice);
                  }}
                />
              </div>

              <div className="relative mx-6 overflow-visible">
                <div className="relative w-full">
                  <span
                    className="absolute text-gray-500 text-sm whitespace-nowrap"
                    style={{ left: "0%", transform: "translateX(0%)" }}
                  >
                    5 000 ₽
                  </span>
                  <span
                    className="absolute text-gray-500 text-sm whitespace-nowrap"
                    style={{
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    {new Intl.NumberFormat("ru-RU").format(
                      Math.round(5000 + (maxPrice - 5000) * 0.5)
                    )}{" "}
                    ₽
                  </span>
                  <span
                    className="absolute text-gray-500 text-sm whitespace-nowrap"
                    style={{
                      left: "100%",
                      transform: "translateX(-100%)",
                    }}
                  >
                    {new Intl.NumberFormat("ru-RU").format(maxPrice)} ₽
                  </span>
                </div>
              </div>
            </section>

            {/* Срок договора */}
            <section>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#223042] mb-2 md:mb-0">
                  Срок рассрочки
                </h3>
                <input
                  type="text"
                  value={termInputValue}
                  onFocus={() => {
                    if (termInputValue === "0" || termInputValue === "3") {
                      setTermInputValue("");
                    }
                  }}
                  onChange={(e) => handleTermInput(e.target.value)}
                  onBlur={handleTermBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleTermBlur();
                      e.target.blur();
                    }
                  }}
                  className="pill-input w-full input-fixed-desktop"
                  placeholder=""
                />
              </div>

              <div className="mb-4">
                <input
                  className="sber-range marks-4"
                  type="range"
                  min={3}
                  max={maxTerm}
                  step={1}
                  value={term}
                  onChange={(e) => {
                    handleTermSlider(e.target.value);
                    updateSliderFill(e.target, e.target.value, 3, maxTerm);
                  }}
                />
              </div>

              <div className="relative mx-6 overflow-visible">
                <div className="relative w-full">
                  <span
                    className="absolute text-gray-500 text-sm whitespace-nowrap"
                    style={{ left: "0%", transform: "translateX(0%)" }}
                  >
                    3 мес.
                  </span>
                  <span
                    className="absolute text-gray-500 text-sm whitespace-nowrap"
                    style={{
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    {Math.round(3 + (maxTerm - 3) * 0.5)} мес.
                  </span>
                  <span
                    className="absolute text-gray-500 text-sm whitespace-nowrap"
                    style={{
                      left: "100%",
                      transform: "translateX(-100%)",
                    }}
                  >
                    {maxTerm} мес.
                  </span>
                </div>
              </div>
            </section>

            {/* Первый взнос */}
            <section className={`mb-8 ${!hasDown ? "section-disabled" : ""}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#223042] mb-2 md:mb-0">
                  Первоначальный взнос
                </h3>

                <div className="flex items-center gap-3 w-full container-fixed-desktop">
                  {/* ==== ₽ ручной ввод ==== */}
                  <input
                    type="text"
                    value={hasDown ? downInputValue : "0"}
                    onFocus={() => {
                      if (!hasDown) return;
                      if (downInputValue === "0" || downInputValue === "0 ₽") {
                        setDownInputValue("");
                      }
                    }}
                    onChange={(e) => handleDownInput(e.target.value)}
                    onBlur={handleDownBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleDownBlur();
                        e.target.blur();
                      }
                    }}
                    className="pill-input flex-1"
                    style={{ flexBasis: "60%" }}
                    placeholder=""
                    disabled={!hasDown}
                    readOnly={!hasDown}
                  />

                  {/* ==== % ввод ==== */}
                  <div
                    className="relative flex-1"
                    style={{ flexBasis: "40%" }}
                  >
                    <input
                      type="text"
                      value={hasDown ? downPercent : "0"}
                      onFocus={() => {
                        if (!hasDown) return;
                        if (downPercent === 0) setDownPercent("");
                      }}
                      onChange={(e) => handleDownPercentInput(e.target.value)}
                      onBlur={handleDownPercentBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleDownPercentBlur();
                          e.target.blur();
                        }
                      }}
                      className="pill-input-percent-small w-full"
                      placeholder=""
                      disabled={!hasDown}
                      readOnly={!hasDown}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#223042] font-semibold pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* ===== Слайдер ===== */}
              <div className="mb-4">
                <input
                  className="sber-range marks-4"
                  type="range"
                  min={Math.round(price * 0.2)}
                  max={price}
                  step={500}
                  value={
                    hasDown
                      ? clamp(
                          downPayment,
                          Math.round(price * 0.2),
                          price
                        )
                      : Math.round(price * 0.2)
                  }
                  onChange={(e) => {
                    if (!hasDown) return;

                    const val = Number(e.target.value);
                    setDownPayment(val);
                    setDownPercent(Math.round((val / priceRef.current) * 100));
                    setDownInputValue(
                      new Intl.NumberFormat("ru-RU").format(val)
                    );

                    updateSliderFill(
                      e.target,
                      val,
                      Math.round(priceRef.current * 0.2),
                      priceRef.current
                    );
                  }}
                  disabled={!hasDown}
                />
              </div>

              {/* ===== деления ===== */}
              <div className="relative mx-6 overflow-visible">
                <div className="relative w-full">
                  <span
                    className="absolute text-gray-500 text-sm whitespace-nowrap"
                    style={{ left: "0%", transform: "translateX(0%)" }}
                  >
                    {new Intl.NumberFormat("ru-RU").format(
                      Math.round(price * 0.2)
                    )}{" "}
                    ₽
                  </span>

                  <span
                    className="absolute text-gray-500 text-sm whitespace-nowrap"
                    style={{ left: "50%", transform: "translateX(-50%)" }}
                  >
                    {new Intl.NumberFormat("ru-RU").format(
                      Math.round(price * 0.6)
                    )}{" "}
                    ₽
                  </span>

                  <span
                    className="absolute text-gray-500 text-sm whitespace-nowrap"
                    style={{ left: "100%", transform: "translateX(-100%)" }}
                  >
                    {new Intl.NumberFormat("ru-RU").format(price)} ₽
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* правая карточка с расчётом */}
          <aside className="lg:sticky lg:top-4 h-fit space-y-4">
            {/* карточка с подсказкой - только на десктопе */}
            <div
              className="hidden lg:block rounded-2xl border p-4"
              style={{ backgroundColor: INFO_BLUE_BG, borderColor: INFO_BLUE }}
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: INFO_BLUE }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: INFO_BLUE }}
                >
                  <p>
                    Без поручителя — до <b>70 000 ₽</b>
                    <br />
                    С поручителем — до <b>100 000 ₽</b>
                    <br />
                    С поручителем и первым взносом — до <b>200 000 ₽</b>
                  </p>
                </div>
              </div>
            </div>

            {/* карточка с расчётом */}
            <div
              className={`relative bg-white rounded-2xl shadow-sm border border-gray-200 p-5 ${
                loading ? "opacity-80" : ""
              }`}
            >
              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d9f8a]"></div>
                    <span className="text-gray-600 font-medium">
                      Расчёт...
                    </span>
                  </div>
                </div>
              )}

              {hasValidationErrors ? (
                <>
                  <div className="text-gray-500 text-sm mb-2">
                    Проверьте введенные данные:
                  </div>
                  <div className="space-y-3 mb-6">
                    {inputErrors.map((error, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-700 text-sm">{error}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-gray-500 text-sm mb-2">
                    Ежемесячный платёж:
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold mb-4 text-[#223042]">
                    {data ? fmtRub(data.monthlyPayment) : "—"}
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-sm mb-6">
                    <InfoRow
                      label="Общая сумма рассрочки:"
                      value={data ? fmtRub(data.total) : "—"}
                    />
                    <InfoRow
                      label="Торговая наценка в месяц:"
                      value={data ? fmtRub(monthlyOverpay) : "—"}
                    />
                  </div>
                </>
              )}

              <button
                onClick={() => setModalOpen(true)}
                disabled={loading || !data || hasValidationErrors}
                className={`w-full rounded-full py-3 font-semibold transition shadow-sm mb-3 ${
                  loading || !data || hasValidationErrors
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "text-white"
                }`}
                style={
                  loading || !data || hasValidationErrors
                    ? {}
                    : {
                        background: `linear-gradient(135deg, ${LOGO_BLUE} 0%, ${LOGO_GREEN} 100%)`,
                      }
                }
                onMouseOver={
                  loading || !data || hasValidationErrors
                    ? undefined
                    : (e) =>
                        (e.currentTarget.style.background = `linear-gradient(135deg, ${LOGO_BLUE_HOVER} 0%, #5BA394 100%)`)
                }
                onMouseOut={
                  loading || !data || hasValidationErrors
                    ? undefined
                    : (e) =>
                        (e.currentTarget.style.background = `linear-gradient(135deg, ${LOGO_BLUE} 0%, ${LOGO_GREEN} 100%)`)
                }
              >
                {loading ? "Расчёт..." : "Оформить рассрочку"}
              </button>

              <p className="text-xs text-gray-500 leading-snug">
                Стоимость товара и приведенные расчеты через калькулятор
                являются предварительными. Для точного определения условий
                договора, пожалуйста, обратитесь на рабочий номер.
              </p>

              {error && (
                <p className="text-red-500 text-sm mt-3">{error}</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* модалка */}
      {modalOpen && (
        <ModalForm
          onClose={() => setModalOpen(false)}
          clientName={clientName}
          setClientName={setClientName}
          productName={productName}
          setProductName={setProductName}
          onSubmit={sendWA}
        />
      )}

      <ContactSection />
    </div>
  );
}

/** ===== вспомогательные ===== */
function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-[#223042] text-base">
        {value}
      </span>
    </div>
  );
}
