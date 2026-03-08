import { useState, useEffect } from "react";

const STEP_VALUE = 10000;
const TOTAL_STEPS = 10;
const TOTAL_GOAL = STEP_VALUE * TOTAL_STEPS;

const formatBRL = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function InvestmentStaircase() {
  const [entries, setEntries] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [inputLabel, setInputLabel] = useState("");

  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const filledSteps = Math.min(Math.floor(total / STEP_VALUE), TOTAL_STEPS);
  const partialFill = Math.min((total % STEP_VALUE) / STEP_VALUE, 1);
  const progressPercent = Math.min((total / TOTAL_GOAL) * 100, 100);

  const handleAdd = () => {
    const parsed = parseFloat(inputValue.replace(/\./g, "").replace(",", "."));
    if (!parsed || parsed <= 0) return;
    setEntries((prev) => [
      ...prev,
      {
        id: Date.now(),
        label: inputLabel || `Aporte ${prev.length + 1}`,
        amount: parsed,
      },
    ]);
    setInputValue("");
    setInputLabel("");
  };

  const handleRemove = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d15 100%)",
      fontFamily: "'Georgia', serif",
      padding: "32px 16px",
      color: "#e8dcc8",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#c9a84c", textTransform: "uppercase", marginBottom: 10 }}>
            Assessoria de Investimentos
          </div>
          <h1 style={{ fontSize: 36, fontWeight: "normal", margin: 0, letterSpacing: 1, color: "#f0e6c8" }}>
            Escadaria de Captação
          </h1>
          <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, #c9a84c, transparent)", margin: "16px auto 0" }} />
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Captado", value: formatBRL(total), color: "#c9a84c" },
            { label: "Meta", value: formatBRL(TOTAL_GOAL), color: "#e8dcc8" },
            { label: "Restante", value: formatBRL(Math.max(TOTAL_GOAL - total, 0)), color: total >= TOTAL_GOAL ? "#4caf72" : "#e8866a" },
          ].map((item) => (
            <div key={item.label} style={{
              background: "rgba(201,168,76,0.05)",
              border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 12,
              padding: "20px 16px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#888", textTransform: "uppercase", marginBottom: 8 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: "bold", color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Staircase */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(201,168,76,0.15)",
          borderRadius: 16,
          padding: "32px 24px 24px",
          marginBottom: 32,
        }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#c9a84c", textTransform: "uppercase", marginBottom: 28, textAlign: "center" }}>
            Degraus — R$ 10.000 cada
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, height: 240, padding: "0 8px" }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const stepNumber = i + 1;
              const isFull = stepNumber <= filledSteps;
              const isPartial = stepNumber === filledSteps + 1 && partialFill > 0;
              const stepHeight = 20 + i * 20;

              return (
                <div key={i} style={{
                  flex: 1,
                  height: stepHeight,
                  position: "relative",
                  borderRadius: "4px 4px 0 0",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(201,168,76,0.1)",
                  overflow: "hidden",
                  transition: "all 0.4s ease",
                }}>
                  {(isFull || isPartial) && (
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      height: isFull ? "100%" : `${partialFill * 100}%`,
                      background: isFull
                        ? "linear-gradient(180deg, #d4a843 0%, #c9a84c 40%, #a8892e 100%)"
                        : "linear-gradient(180deg, #c9a84c66 0%, #c9a84c44 100%)",
                      transition: "height 0.5s cubic-bezier(0.4,0,0.2,1)",
                    }} />
                  )}
                  <div style={{
                    position: "absolute", bottom: 4, left: 0, right: 0,
                    textAlign: "center", fontSize: 10, fontWeight: "bold",
                    color: isFull ? "#0a0a0f" : "rgba(201,168,76,0.5)",
                    zIndex: 1, letterSpacing: 1,
                  }}>
                    {stepNumber}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${progressPercent}%`,
                background: "linear-gradient(90deg, #a8892e, #d4a843)",
                borderRadius: 3, transition: "width 0.6s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#666" }}>
              <span>R$ 0</span>
              <span style={{ color: "#c9a84c", fontWeight: "bold" }}>{progressPercent.toFixed(1)}% concluído</span>
              <span>R$ 100.000</span>
            </div>
          </div>
        </div>

        {/* Input */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(201,168,76,0.15)",
          borderRadius: 16, padding: "28px 24px", marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#c9a84c", textTransform: "uppercase", marginBottom: 20 }}>
            Registrar Aporte
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Descrição (opcional)"
              value={inputLabel}
              onChange={(e) => setInputLabel(e.target.value)}
              style={{
                flex: "1 1 180px", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(201,168,76,0.25)", borderRadius: 8,
                padding: "12px 16px", color: "#e8dcc8", fontSize: 14, outline: "none", fontFamily: "inherit",
              }}
            />
            <input
              type="text"
              placeholder="Valor (ex: 5000)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{
                flex: "1 1 160px", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(201,168,76,0.25)", borderRadius: 8,
                padding: "12px 16px", color: "#e8dcc8", fontSize: 14, outline: "none", fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleAdd}
              style={{
                background: "linear-gradient(135deg, #c9a84c, #a8892e)",
                border: "none", borderRadius: 8, padding: "12px 28px",
                color: "#0a0a0f", fontSize: 14, fontWeight: "bold",
                cursor: "pointer", letterSpacing: 1, fontFamily: "inherit",
              }}
            >
              + Adicionar
            </button>
          </div>
        </div>

        {/* Entries */}
        {entries.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(201,168,76,0.15)",
            borderRadius: 16, padding: "24px",
          }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>
              Aportes Registrados
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {entries.map((entry, idx) => (
                <div key={entry.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", background: "rgba(201,168,76,0.05)",
                  borderRadius: 8, border: "1px solid rgba(201,168,76,0.1)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(201,168,76,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#c9a84c", fontWeight: "bold",
                    }}>{idx + 1}</span>
                    <span style={{ fontSize: 14, color: "#d0c4a8" }}>{entry.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 15, fontWeight: "bold", color: "#c9a84c" }}>{formatBRL(entry.amount)}</span>
                    <button onClick={() => handleRemove(entry.id)} style={{
                      background: "transparent", border: "1px solid rgba(232,134,106,0.3)",
                      borderRadius: 6, color: "#e8866a", cursor: "pointer", padding: "2px 8px", fontSize: 12,
                    }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(201,168,76,0.2)", marginTop: 12, paddingTop: 12 }}>
              <span style={{ fontSize: 13, letterSpacing: 2, color: "#888", textTransform: "uppercase" }}>Total Captado</span>
              <span style={{ fontSize: 20, fontWeight: "bold", color: total >= TOTAL_GOAL ? "#4caf72" : "#c9a84c" }}>{formatBRL(total)}</span>
            </div>
          </div>
        )}

        {total >= TOTAL_GOAL && (
          <div style={{ marginTop: 24, padding: "20px", background: "rgba(76,175,114,0.1)", border: "1px solid rgba(76,175,114,0.3)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🏆</div>
            <div style={{ color: "#4caf72", fontWeight: "bold", letterSpacing: 2, fontSize: 16 }}>
              META ALCANÇADA — R$ 100.000 CAPTADOS!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}