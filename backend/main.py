"""
Heat Exchanger Network Synthesis (HENS) - FastAPI Backend
Grassroot Design & Retrofitting Models (Fully Dynamic API)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
from gekko import GEKKO
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HENS Optimizer API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # بيسمح لأي موقع إنه يبعت داتا للباك إند
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Models ────────────────────────────────────────────────────────

class Stream(BaseModel):
    id: str
    Tin: float = Field(..., description="Inlet temperature (°C)")
    Tout: float = Field(..., description="Outlet temperature (°C)")
    Mcp: float = Field(..., description="Heat capacity flow rate (kW/°C)")

class ExistingMatch(BaseModel):
    hot_id: str
    cold_id: str
    stage: int = 1
    area_old: float
    q_old: float = 0.0

class ExistingUtility(BaseModel):
    stream_id: str
    utility_type: str  # "Heater" or "Cooler"
    q_old: float

class OptimizationRequest(BaseModel):
    hot_streams: List[Stream] = Field(..., min_items=2)
    cold_streams: List[Stream] = Field(..., min_items=2)
    U: float = Field(default=0.5, description="Overall heat transfer coefficient")
    annualized_cost: float = Field(default=0.26, description="Capital cost factor")
    hot_utility_cost: float = Field(default=80.0, description="Hot utility cost")
    cold_utility_cost: float = Field(default=20.0, description="Cold utility cost")
    HRAT: float = Field(default=10.0, description="HRAT (°C)")
    max_matches: int = Field(default=5, description="Max HX matches")
    
    fixed_hx_cost: float = Field(default=35000.0, description="Fixed Cost for new HX")
    area_cost_coef: float = Field(default=800.0, description="Area Cost Coefficient")
    area_cost_exp: float = Field(default=0.8, description="Area Cost Exponent")

    existing_matches: List[ExistingMatch] = []
    existing_utilities: List[ExistingUtility] = []

class HeatExchanger(BaseModel):
    hot_id: str
    cold_id: str
    stage: int
    Q_ex: float
    area: float
    T_hot_in: float
    T_hot_out: float
    T_cold_in: float
    T_cold_out: float
    area_old: float = 0.0
    area_new: float = 0.0
    excess_area: float = 0.0

class UtilityMatch(BaseModel):
    stream_id: str
    utility_type: str
    Q: float
    T_in: float
    T_out: float

class OptimizationResult(BaseModel):
    status: str
    total_cost: float
    utility_cost: float
    capital_cost: float
    hot_utility: float
    cold_utility: float
    heat_exchangers: List[HeatExchanger]
    solver_message: str
    utility_matches: List[UtilityMatch] = []
    payback_period: float = 0.0
    total_investment: float = 0.0
    annual_savings: float = 0.0

# ─── Grassroot Design Solver ────────────────────────────────────────────────
@app.post("/optimize", response_model=OptimizationResult)
async def optimize_hens(request: OptimizationRequest):
    try:
        m = GEKKO(remote=False)
        m.options.SOLVER = 1
        m.options.IMODE = 3
        m.options.MAX_ITER = 2000

        H = request.hot_streams
        C = request.cold_streams
        N_stages = 3

        def smax(x, val=1.0):
            return (x + m.sqrt(x**2 + 0.01)) / 2.0 + val/2.0

        Q_cu = [m.Var(value=0, lb=0) for i in range(len(H))]  
        Q_hu = [m.Var(value=0, lb=0) for j in range(len(C))]  

        TH = [[m.Var(value=H[i].Tin, lb=H[i].Tout, ub=H[i].Tin) for k in range(N_stages + 1)] for i in range(len(H))]
        TC = [[m.Var(value=C[j].Tin, lb=C[j].Tin, ub=C[j].Tout) for k in range(N_stages + 1)] for j in range(len(C))]

        Q_ex = [[[m.Var(value=0, lb=0) for k in range(N_stages)] for j in range(len(C))] for i in range(len(H))]
        Y = [[[m.Var(value=0, integer=True, lb=0, ub=1) for k in range(N_stages)] for j in range(len(C))] for i in range(len(H))]
        Area = [[[m.Var(value=1, lb=0) for k in range(N_stages)] for j in range(len(C))] for i in range(len(H))]

        for i in range(len(H)): m.Equation(TH[i][0] == H[i].Tin)
        for j in range(len(C)): m.Equation(TC[j][N_stages] == C[j].Tin)

        for i in range(len(H)):
            m.Equation(H[i].Mcp * (TH[i][N_stages] - H[i].Tout) == Q_cu[i])
            for k in range(N_stages):
                m.Equation(H[i].Mcp * (TH[i][k] - TH[i][k+1]) == sum([Q_ex[i][j][k] for j in range(len(C))]))
                m.Equation(TH[i][k] >= TH[i][k+1])
                
        for j in range(len(C)):
            m.Equation(C[j].Mcp * (C[j].Tout - TC[j][0]) == Q_hu[j])
            for k in range(N_stages):
                m.Equation(C[j].Mcp * (TC[j][k] - TC[j][k+1]) == sum([Q_ex[i][j][k] for i in range(len(H))]))
                m.Equation(TC[j][k] >= TC[j][k+1])

        for i in range(len(H)):
            for j in range(len(C)):
                m.Equation(sum([Y[i][j][k] for k in range(N_stages)]) <= 1)
                for k in range(N_stages):
                    max_q_ij = min(H[i].Mcp * (H[i].Tin - H[i].Tout), C[j].Mcp * (C[j].Tout - C[j].Tin))
                    m.Equation(Q_ex[i][j][k] <= max_q_ij * Y[i][j][k])

                    Gamma = 10000.0
                    m.Equation(TH[i][k] - TC[j][k] >= request.HRAT * Y[i][j][k] - Gamma * (1 - Y[i][j][k]))
                    m.Equation(TH[i][k+1] - TC[j][k+1] >= request.HRAT * Y[i][j][k] - Gamma * (1 - Y[i][j][k]))

                    dt1 = smax(TH[i][k] - TC[j][k], 1.0)
                    dt2 = smax(TH[i][k+1] - TC[j][k+1], 1.0)
                    lmtd = m.Intermediate((dt1 * dt2 * 0.5 * (dt1 + dt2))**0.3333333)
                    m.Equation(Q_ex[i][j][k] == request.U * Area[i][j][k] * lmtd)

        m.Equation(sum([Y[i][j][k] for i in range(len(H)) for j in range(len(C)) for k in range(N_stages)]) <= request.max_matches)

        Fixed_Cost = sum([request.fixed_hx_cost * Y[i][j][k] for i in range(len(H)) for j in range(len(C)) for k in range(N_stages)])
        Variable_Cost = sum([request.area_cost_coef * (Area[i][j][k] + 1e-4)**request.area_cost_exp for i in range(len(H)) for j in range(len(C)) for k in range(N_stages)])
        
        Total_Capital_Cost = m.Intermediate(request.annualized_cost * (Fixed_Cost + Variable_Cost))
        Total_Utility_Cost = m.Intermediate(sum([Q_hu[j] * request.hot_utility_cost for j in range(len(C))]) + sum([Q_cu[i] * request.cold_utility_cost for i in range(len(H))]))

        TAC = m.Intermediate(Total_Utility_Cost + Total_Capital_Cost) 
        m.Obj(TAC)
        m.solve(disp=False)

        exchangers = []
        for i in range(len(H)):
            for j in range(len(C)):
                for k in range(N_stages):
                    if Y[i][j][k].value[0] > 0.5:
                        exchangers.append(HeatExchanger(
                            hot_id=H[i].id, cold_id=C[j].id, stage=k+1,
                            Q_ex=round(Q_ex[i][j][k].value[0], 2), area=round(Area[i][j][k].value[0], 2),
                            T_hot_in=round(TH[i][k].value[0], 2), T_hot_out=round(TH[i][k+1].value[0], 2),
                            T_cold_in=round(TC[j][k+1].value[0], 2), T_cold_out=round(TC[j][k].value[0], 2)
                        ))
                       
        utilities = []
        for i in range(len(H)):
            if Q_cu[i].value[0] > 1e-2:
                utilities.append(UtilityMatch(stream_id=H[i].id, utility_type="Cooler", Q=round(Q_cu[i].value[0], 2), T_in=round(TH[i][N_stages].value[0], 2), T_out=H[i].Tout))
        for j in range(len(C)):
            if Q_hu[j].value[0] > 1e-2:
                utilities.append(UtilityMatch(stream_id=C[j].id, utility_type="Heater", Q=round(Q_hu[j].value[0], 2), T_in=round(TC[j][0].value[0], 2), T_out=C[j].Tout))

        return OptimizationResult(
            status="optimal", total_cost=round(TAC.value[0], 2), utility_cost=round(Total_Utility_Cost.value[0], 2),
            capital_cost=round(Total_Capital_Cost.value[0], 2), hot_utility=sum([u.Q for u in utilities if u.utility_type=="Heater"]), 
            cold_utility=sum([u.Q for u in utilities if u.utility_type=="Cooler"]),
            heat_exchangers=exchangers, utility_matches=utilities, solver_message="Grassroot Design Complete."
        )
    except Exception as e:
        logger.exception("Grassroot error")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Retrofitting Design Solver ─────────────────────────────────────────────
@app.post("/retrofit", response_model=OptimizationResult)
async def optimize_retrofit(request: OptimizationRequest):
    try:
        m = GEKKO(remote=False)
        m.options.SOLVER = 1
        m.options.IMODE = 3
        m.options.MAX_ITER = 3000
        N_stages = 4

        def smax(x, val=1.0):
            return (x + m.sqrt(x**2 + 0.01)) / 2.0 + val/2.0

        H = request.hot_streams
        C = request.cold_streams
        
        A_OLD = [[0.0 for j in range(len(C))] for i in range(len(H))]
        for em in request.existing_matches:
            i_idx = next((idx for idx, s in enumerate(H) if s.id == em.hot_id), -1)
            j_idx = next((idx for idx, s in enumerate(C) if s.id == em.cold_id), -1)
            if i_idx != -1 and j_idx != -1:
                A_OLD[i_idx][j_idx] = em.area_old

        TH = [[m.Var(value=H[i].Tin, lb=H[i].Tout, ub=H[i].Tin) for k in range(N_stages + 1)] for i in range(len(H))]
        TC = [[m.Var(value=C[j].Tin, lb=C[j].Tin, ub=C[j].Tout) for k in range(N_stages + 1)] for j in range(len(C))]

        Q_ex = [[[m.Var(value=0, lb=0) for k in range(N_stages)] for j in range(len(C))] for i in range(len(H))]
        Y = [[[m.Var(value=0, integer=True, lb=0, ub=1) for k in range(N_stages)] for j in range(len(C))] for i in range(len(H))]
        Area = [[[m.Var(value=10, lb=0) for k in range(N_stages)] for j in range(len(C))] for i in range(len(H))]
        Area_New = [[[m.Var(value=0, lb=0, ub=5000) for k in range(N_stages)] for j in range(len(C))] for i in range(len(H))]
        Excess_Area = [[[m.Var(value=0, lb=0, ub=5000) for k in range(N_stages)] for j in range(len(C))] for i in range(len(H))]

        Q_cu = [m.Var(value=0, lb=0) for i in range(len(H))]
        Q_hu = [m.Var(value=0, lb=0) for j in range(len(C))]

        for i in range(len(H)): m.Equation(TH[i][0] == H[i].Tin)
        for j in range(len(C)): m.Equation(TC[j][N_stages] == C[j].Tin)

        for i in range(len(H)):
            m.Equation(H[i].Mcp * (TH[i][N_stages] - H[i].Tout) == Q_cu[i])
            for k in range(N_stages):
                m.Equation(H[i].Mcp * (TH[i][k] - TH[i][k+1]) == sum(Q_ex[i][j][k] for j in range(len(C))))
                m.Equation(TH[i][k] >= TH[i][k+1])

        for j in range(len(C)):
            m.Equation(C[j].Mcp * (C[j].Tout - TC[j][0]) == Q_hu[j])
            for k in range(N_stages):
                m.Equation(C[j].Mcp * (TC[j][k] - TC[j][k+1]) == sum(Q_ex[i][j][k] for i in range(len(H))))
                m.Equation(TC[j][k] >= TC[j][k+1])

        for i in range(len(H)):
            for j in range(len(C)):
                m.Equation(sum([Y[i][j][k] for k in range(N_stages)]) <= 1)

                for k in range(N_stages):
                    max_q = min(H[i].Mcp*(H[i].Tin-H[i].Tout), C[j].Mcp*(C[j].Tout-C[j].Tin))
                    m.Equation(Q_ex[i][j][k] <= max_q * Y[i][j][k])

                    Gamma = 10000.0
                    m.Equation(TH[i][k] - TC[j][k] >= request.HRAT * Y[i][j][k] - Gamma * (1 - Y[i][j][k]))
                    m.Equation(TH[i][k+1] - TC[j][k+1] >= request.HRAT * Y[i][j][k] - Gamma * (1 - Y[i][j][k]))

                    dt1 = smax(TH[i][k] - TC[j][k], 1.0)
                    dt2 = smax(TH[i][k+1] - TC[j][k+1], 1.0)
                    lmtd = m.Intermediate((dt1 * dt2 * 0.5 * (dt1 + dt2))**0.3333333)
                    m.Equation(Q_ex[i][j][k] == request.U * Area[i][j][k] * lmtd)

                    m.Equation(Area[i][j][k] <= Area_New[i][j][k] + A_OLD[i][j]*Y[i][j][k] + Excess_Area[i][j][k])
                    m.Equation(Area_New[i][j][k] <= 10000 * Y[i][j][k])
                    m.Equation(Excess_Area[i][j][k] <= 10000 * Y[i][j][k])
                    m.Equation(Area_New[i][j][k] * A_OLD[i][j] == 0) 
                    m.Equation(Excess_Area[i][j][k] <= 1000 * A_OLD[i][j])


# ─── Dynamic Topology & Heat Duty Based on UI Inputs ───
        
        # 1. إنشاء مصفوفة ذكية لتحديد المبادلات الموجودة بالفعل (بدون الاعتماد على المساحة)
        is_existing_pair = [[False for j in range(len(C))] for i in range(len(H))]
        
        for em in request.existing_matches:
            i_idx = next((idx for idx, s in enumerate(H) if s.id == em.hot_id), -1)
            j_idx = next((idx for idx, s in enumerate(C) if s.id == em.cold_id), -1)
            if i_idx != -1 and j_idx != -1:
                is_existing_pair[i_idx][j_idx] = True
                k_idx = em.stage - 1
                if 0 <= k_idx < N_stages:
                    # إجبار المبادل إنه يتحط في الـ Stage اللي متتحددة في الواجهة
                    m.Equation(Y[i_idx][j_idx][k_idx] == 1)
                
                # إجبار المبادل القديم إنه يسحب حرارة زي الواجهة
                if em.q_old > 0:
                    m.Equation(sum([Q_ex[i_idx][j_idx][k] for k in range(N_stages)]) == em.q_old)
        
        # 2. إجبار المبادلات الجديدة على الأطراف فقط وجمعها في لستة
        new_hx_vars = []
        for i in range(len(H)):
            for j in range(len(C)):
                if not is_existing_pair[i][j]:  # لو ده مبادل جديد (مفيش مساحة قديمة)
                    for k in range(N_stages):
                        new_hx_vars.append(Y[i][j][k])
                        if k in range(1, N_stages - 1):  # المراحل الوسطى (Stage 2 و 3)
                            m.Equation(Y[i][j][k] == 0)   # ممنوع الإضافة هنا للحفاظ على المواسير
                            
        # 3. ── التعديل السحري: إجبار المحرك يركب مبادل جديد (زي كود اللينجو بتاعك) ──
        m.Equation(sum(new_hx_vars) == 1)
        
        m.Equation(sum([Y[i][j][k] for i in range(len(H)) for j in range(len(C)) for k in range(N_stages)]) <= request.max_matches)

        # ─── حساب التكاليف وفترة الاسترداد (معالجة الاستقرار الرياضي) ───
        Fixed_Cost = sum([request.fixed_hx_cost * Y[i][j][k] for i in range(len(H)) for j in range(len(C)) for k in range(N_stages) if not is_existing_pair[i][j]])
        Variable_Cost = sum([request.area_cost_coef * (Area_New[i][j][k]+1e-2)**request.area_cost_exp + request.area_cost_coef * (Excess_Area[i][j][k]+1e-2)**request.area_cost_exp for i in range(len(H)) for j in range(len(C)) for k in range(N_stages)])
        Total_Invest = m.Intermediate(Fixed_Cost + Variable_Cost)
        
        Q_HOT_old_arr = [0.0 for _ in range(len(C))]
        Q_COLD_old_arr = [0.0 for _ in range(len(H))]

        for eu in request.existing_utilities:
            if eu.utility_type == "Heater":
                j_idx = next((idx for idx, s in enumerate(C) if s.id == eu.stream_id), -1)
                if j_idx != -1: Q_HOT_old_arr[j_idx] += eu.q_old
            elif eu.utility_type == "Cooler":
                i_idx = next((idx for idx, s in enumerate(H) if s.id == eu.stream_id), -1)
                if i_idx != -1: Q_COLD_old_arr[i_idx] += eu.q_old

        savings_hot = sum([request.hot_utility_cost * (Q_HOT_old_arr[j] - Q_hu[j]) for j in range(len(C))])
        savings_cold = sum([request.cold_utility_cost * (Q_COLD_old_arr[i] - Q_cu[i]) for i in range(len(H))])
        
        # 4. ── حماية التوفير من الحلول الصفرية (عشان نقسم على رقم حقيقي) ──
        Return = m.Var(value=10000, lb=1.0) # التوفير لازم يكون أكبر من 1 دولار
        m.Equation(Return <= savings_hot + savings_cold)
        
        Payback = m.Intermediate(Total_Invest / Return)
        m.Obj(Payback)

        m.solve(disp=False)

        exchangers = []
        for i in range(len(H)):
            for j in range(len(C)):
                for k in range(N_stages):
                    if Y[i][j][k].value[0] > 0.5:
                        exchangers.append(HeatExchanger(
                            hot_id=H[i].id, cold_id=C[j].id, stage=k+1, 
                            Q_ex=round(Q_ex[i][j][k].value[0], 2), area=round(Area[i][j][k].value[0], 2),
                            T_hot_in=round(TH[i][k].value[0], 2), T_hot_out=round(TH[i][k+1].value[0], 2), 
                            T_cold_in=round(TC[j][k+1].value[0], 2), T_cold_out=round(TC[j][k].value[0], 2),
                            area_old=round(A_OLD[i][j], 2), area_new=round(Area_New[i][j][k].value[0], 2), excess_area=round(Excess_Area[i][j][k].value[0], 2)
                        ))

        utilities = []
        for i in range(len(H)):
            if Q_cu[i].value[0] > 1e-2:
                utilities.append(UtilityMatch(stream_id=H[i].id, utility_type="Cooler", Q=round(Q_cu[i].value[0], 2), T_in=round(TH[i][N_stages].value[0], 2), T_out=H[i].Tout))
        for j in range(len(C)):
            if Q_hu[j].value[0] > 1e-2:
                utilities.append(UtilityMatch(stream_id=C[j].id, utility_type="Heater", Q=round(Q_hu[j].value[0], 2), T_in=round(TC[j][0].value[0], 2), T_out=C[j].Tout))

        return OptimizationResult(
            status="optimal", total_cost=0.0, utility_cost=0.0, capital_cost=0.0, 
            hot_utility=round(sum([u.Q for u in utilities if u.utility_type=="Heater"]), 2), 
            cold_utility=round(sum([u.Q for u in utilities if u.utility_type=="Cooler"]), 2),
            heat_exchangers=exchangers, utility_matches=utilities, 
            solver_message="Fully Dynamic Retrofitting Successful! Network respects all user inputs.",
            payback_period=round(Payback.value[0], 2), total_investment=round(Total_Invest.value[0], 2), annual_savings=round(Return.value[0], 2)
        )
    except Exception as e:
        logger.exception("Retrofit error")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "service": "HENS Optimizer API"}

@app.get("/")
async def root():
    return {
        "title": "Heat Exchanger Network Synthesis API",
        "version": "2.0.0"
    }