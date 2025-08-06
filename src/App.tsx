import React, { type FC, useEffect, useRef, useState } from "react";

// [중요] 아래 라이브러리들을 npm install 하는 대신 CDN으로 불러옵니다.
// public/index.html 파일의 <head> 태그 안에 아래 링크와 스크립트를 추가해주세요.
/*
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- TUI Grid & Picker CSS -->
  <link rel="stylesheet" href="https://uicdn.toast.com/grid/latest/tui-grid.min.css" />
  <link rel="stylesheet" href="https://uicdn.toast.com/date-picker/latest/tui-date-picker.min.css" />
  <link rel="stylesheet" href="https://uicdn.toast.com/time-picker/latest/tui-time-picker.min.css" />

  <!-- TUI Grid & Picker JS -->
  <!-- 주의: tui-grid.js 보다 tui-date-picker.js 와 tui-time-picker.js가 먼저 로드되어야 합니다. -->
  <script src="https://uicdn.toast.com/date-picker/latest/tui-date-picker.min.js"></script>
  <script src="https://uicdn.toast.com/time-picker/latest/tui-time-picker.min.js"></script>
  <script src="https://uicdn.toast.com/grid/latest/tui-grid.min.js"></script>
*/

// --- TypeScript 타입 정의 ---

// 사용자 데이터 타입을 정의합니다.
interface UserData {
  id: number;
  name: string;
  department: string;
  grade: number;
  city: string;
  joinDate: string;
  score: number;
}

// 부서 데이터 타입을 정의합니다.
interface DepartmentData {
  department: string;
  userCount: number;
}

// TUI Grid 컬럼 옵션의 타입을 정의합니다.
interface ColumnInfo {
  header: string;
  name: string;
  width?: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  editor?:
    | "text"
    | "datePicker"
    | {
        type: "select" | "datePicker";
        options?: { [key: string]: any };
      };
  validation?: {
    dataType?: "string" | "number";
    required?: boolean;
    min?: number;
    max?: number;
  };
  onAfterChange?: (ev: any) => void;
  renderer?: {
    type: any;
    options?: { [key: string]: any };
  };
}

// TUI Grid 인스턴스의 타입 정의
interface GridInstance {
  destroy: () => void;
  resetData: (data: any[]) => void;
  on: (event: string, handler: (ev: any) => void) => void;
  getRow: (rowKey: number | string) => any;
  appendRow: (row: any, options?: { at?: number }) => void;
  removeRow: (rowKey: number | string) => void;
  getCheckedRows: () => any[];
  setValue: (rowKey: string | number, columnName: string, value: any) => void;
  addRowClassName: (rowKey: string | number, className: string) => void;
  removeRowClassName: (rowKey: string | number, className: string) => void;
  check: (rowKey: string | number) => void;
  uncheck: (rowKey: string | number) => void;
  getRowCount: () => number;
}

// window 객체에 tui 네임스페이스가 존재함을 TypeScript에 알립니다.
declare global {
  interface Window {
    tui: {
      Grid: new (options: {
        el: HTMLElement;
        data: any[];
        columns: ColumnInfo[];
        [key: string]: any;
      }) => GridInstance;
    };
  }
}

// GridWrapper 컴포넌트의 Props 타입을 정의합니다.
interface GridWrapperProps {
  data: any[];
  columns: ColumnInfo[];
  onGridClick?: (ev: any) => void;
  onGridReady?: (grid: GridInstance) => void;
  [key: string]: any;
}

// --- 공통 그리드 래퍼 컴포넌트 ---
const GridWrapper: FC<GridWrapperProps> = ({
  data,
  columns,
  onGridClick,
  onGridReady,
  ...options
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<GridInstance | null>(null);

  useEffect(() => {
    if (!gridRef.current || instanceRef.current) return;
    let timeoutId: NodeJS.Timeout | null = null;
    const initializeGrid = () => {
      if (window.tui && window.tui.Grid && gridRef.current) {
        const gridInstance = new window.tui.Grid({
          el: gridRef.current,
          data,
          columns,
          ...options,
        });
        if (onGridClick) gridInstance.on("click", onGridClick);
        if (onGridReady) onGridReady(gridInstance);
        instanceRef.current = gridInstance;
      } else {
        timeoutId = setTimeout(initializeGrid, 100);
      }
    };
    initializeGrid();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, []); // 의존성 배열이 비어있으므로 한 번만 실행됩니다.

  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.resetData(data);
    }
  }, [data]);

  return <div ref={gridRef}></div>;
};

// --- 샘플 데이터 생성 함수 ---
const getSampleData = (count = 100): UserData[] => {
  const data: UserData[] = [];
  const departments = ["Sales", "Marketing", "Development", "HR", "Management"];
  for (let i = 1; i <= count; i++) {
    data.push({
      id: 1000 + i,
      name: `User ${i}`,
      department: departments[i % departments.length],
      grade: (i % 3) + 1,
      city: `City ${i % 10}`,
      joinDate: `202${Math.floor(i / 10)}-${String((i % 12) + 1).padStart(
        2,
        "0"
      )}-${String((i % 28) + 1).padStart(2, "0")}`,
      score: Math.floor(Math.random() * 100),
    });
  }
  return data;
};

const allUsers = getSampleData(100);
const departments = ["Sales", "Marketing", "Development", "HR", "Management"];
const departmentData: DepartmentData[] = departments.map((dept) => ({
  department: dept,
  userCount: allUsers.filter((user) => user.department === dept).length,
}));

// --- 셀 내 체크박스를 위한 커스텀 렌더러 ---
class CheckboxRenderer {
  private el: HTMLInputElement;
  constructor(props: any) {
    const el = document.createElement("input");
    el.type = "checkbox";
    el.className = "tui-grid-cell-checkbox";
    el.checked = Boolean(props.value);
    el.addEventListener("change", () => {
      props.grid.setValue(props.rowKey, "active", el.checked);
    });
    this.el = el;
  }
  getElement() {
    return this.el;
  }
  render(props: any) {
    this.el.checked = Boolean(props.value);
  }
}

// --- 역순 행 번호를 위한 커스텀 렌더러 ---
class DescendingRowNumRenderer {
  private el: HTMLDivElement;
  constructor(props: any) {
    const el = document.createElement("div");
    this.el = el;
    this.render(props);
  }
  getElement() {
    return this.el;
  }
  render(props: any) {
    const rowNum = props.grid.getRowCount() - props.rowKey;
    this.el.innerText = String(rowNum);
  }
}

// --- 그리드 예제 컴포넌트들 ---

const BasicGrid: FC = () => {
  const data = getSampleData(50);
  const columns: ColumnInfo[] = [
    { header: "ID", name: "id", align: "center", width: 80 },
    { header: "이름", name: "name", sortable: true },
    { header: "부서", name: "department", sortable: true },
    { header: "직급", name: "grade", align: "center" },
    { header: "입사일", name: "joinDate", align: "center" },
    { header: "점수", name: "score", align: "right", sortable: true },
  ];

  const selectionTheme = {
    selection: {
      background: "#666666",
      border: "#000000",
    },
    cell: {
      selectedRowHeader: {
        background: "#666666",
      },
      selectedRow: {
        background: "#666666",
        color: "#fff",
      },
    },
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">기본 그리드 (행 선택)</h2>
      <p className="mb-4 text-gray-600">
        데이터 셀을 클릭하면 해당 행 전체가 회색 배경으로 선택됩니다.
      </p>
      <GridWrapper
        data={data}
        columns={columns}
        bodyHeight={500}
        selectionUnit="row"
        rowHeaders={["rowNum"]}
        theme={selectionTheme}
      />
    </div>
  );
};

const complexGridThemeOptions = {
  cell: {
    header: {
      background: "#f4f4f5",
      border: "#e0e0e0",
      text: "#333",
      fontWeight: "bold",
    },
    rowHeader: { background: "#f4f4f5" },
  },
};

const ComplexColumnsGrid: FC = () => {
  const data = getSampleData(10);

  const columns: ColumnInfo[] = [
    { header: "ID", name: "id", align: "center", width: 80 },
    { header: "이름", name: "name" },
    { header: "부서", name: "department" },
    { header: "직급", name: "grade", align: "center" },
    { header: "거주 도시", name: "city" },
    { header: "입사일", name: "joinDate", align: "center" },
    { header: "점수", name: "score", align: "right" },
  ];

  const header = {
    height: 80,
    complexColumns: [
      {
        header: "사용자 정보",
        name: "userInfo",
        childNames: ["name", "department", "grade"],
      },
      {
        header: "상세 정보",
        name: "details",
        childNames: ["city", "joinDate", "score"],
      },
    ],
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">복합 컬럼 그리드</h2>
      <p className="mb-4 text-gray-600">
        복합 헤더가 모두 보이도록 `header.height` 옵션으로 높이를 명시적으로
        지정했습니다.
      </p>
      <div className="border rounded-lg shadow-lg overflow-hidden">
        <GridWrapper
          data={data}
          columns={columns}
          header={header}
          theme={complexGridThemeOptions}
        />
      </div>
    </div>
  );
};

const EditableGrid: FC = () => {
  const data = getSampleData(15).map((user, index) => ({
    ...user,
    active: index % 2 === 0,
  }));
  const columns: ColumnInfo[] = [
    { header: "ID", name: "id", align: "center", width: 80 },
    { header: "이름", name: "name", editor: "text" },
    {
      header: "부서",
      name: "department",
      editor: {
        type: "select",
        options: { listItems: departments.map((d) => ({ text: d, value: d })) },
      },
    },
    {
      header: "입사일",
      name: "joinDate",
      editor: {
        type: "datePicker",
        options: {
          format: "yyyy-MM-dd",
          container: document.body, // [수정] 캘린더가 body에 직접 렌더링되도록 설정
        },
      },
    },
    {
      header: "활성",
      name: "active",
      align: "center",
      width: 80,
      renderer: { type: CheckboxRenderer },
    },
    {
      header: "점수",
      name: "score",
      editor: "text",
      validation: { dataType: "number", required: true, min: 0, max: 100 },
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">셀 편집 (다양한 타입)</h2>
      <p className="mb-4 text-gray-600">
        셀을 더블클릭하여 내용을 편집할 수 있습니다. '활성' 컬럼의 체크박스로
        데이터를 직접 변경할 수도 있습니다.
      </p>
      <GridWrapper
        data={data}
        columns={columns}
        bodyHeight={500}
        rowHeaders={["checkbox"]}
      />
    </div>
  );
};

const MasterDetailGrid: FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    null
  );
  const [detailData, setDetailData] = useState<UserData[]>([]);
  const masterColumns: ColumnInfo[] = [
    { header: "부서명", name: "department", sortable: true },
    { header: "인원수", name: "userCount", align: "right", width: 120 },
  ];
  const detailColumns: ColumnInfo[] = [
    { header: "ID", name: "id", align: "center", width: 80 },
    { header: "이름", name: "name" },
    { header: "직급", name: "grade", align: "center" },
    { header: "입사일", name: "joinDate", align: "center" },
    { header: "점수", name: "score", align: "right" },
  ];
  const handleMasterGridClick = (ev: any) => {
    if (!ev.rowKey) return;
    const rowData = ev.instance.getRow(ev.rowKey);
    if (rowData && rowData.department)
      setSelectedDepartment(rowData.department);
  };
  useEffect(() => {
    if (selectedDepartment) {
      setDetailData(
        allUsers.filter((user) => user.department === selectedDepartment)
      );
    } else {
      setDetailData([]);
    }
  }, [selectedDepartment]);
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">마스터-디테일 그리드</h2>
      <p className="mb-4 text-gray-600">
        상단 그리드에서 부서를 선택하면, 하단 그리드에 해당 부서의 직원 목록이
        나타납니다.
      </p>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-3">부서 목록 (Master)</h3>
        <GridWrapper
          data={departmentData}
          columns={masterColumns}
          onGridClick={handleMasterGridClick}
          bodyHeight={200}
        />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-3">
          부서원 목록 (Detail) {selectedDepartment && `- ${selectedDepartment}`}
        </h3>
        <GridWrapper
          data={detailData}
          columns={detailColumns}
          bodyHeight={300}
        />
      </div>
    </div>
  );
};

const CheckboxAndRowManagementGrid: FC = () => {
  const gridInstanceRef = useRef<GridInstance | null>(null);
  const initialData = getSampleData(10);
  const columns: ColumnInfo[] = [
    { header: "ID", name: "id", align: "center", width: 80 },
    { header: "이름", name: "name", editor: "text" },
    { header: "부서", name: "department", editor: "text" },
    { header: "점수", name: "score", align: "right", editor: "text" },
  ];

  const handleGridReady = (grid: GridInstance) => {
    gridInstanceRef.current = grid;
  };

  const handleGridClick = (ev: any) => {
    if (
      ev.targetType !== "cell" ||
      ev.rowKey === null ||
      ev.rowKey === undefined
    ) {
      return;
    }

    const grid = gridInstanceRef.current;
    if (!grid) return;

    const rowKey = ev.rowKey;
    const checkedRows = grid.getCheckedRows();
    const isChecked = checkedRows.some((row) => row.rowKey === rowKey);

    if (isChecked) {
      grid.uncheck(rowKey);
    } else {
      grid.check(rowKey);
    }
  };

  const handleAddRow = () => {
    const newRow = {
      id: new Date().getTime(),
      name: "New User",
      department: "N/A",
      score: 0,
    };
    gridInstanceRef.current?.appendRow(newRow, { at: 0 });
  };

  const handleDeleteRows = () => {
    const checkedRows = gridInstanceRef.current?.getCheckedRows() || [];
    checkedRows.forEach((row) => {
      gridInstanceRef.current?.removeRow(row.rowKey);
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">행 추가/삭제 (토글)</h2>
      <p className="mb-4 text-gray-600">
        행을 클릭하면 체크박스가 토글됩니다. 버튼으로 행을 추가하거나 삭제할
        수도 있습니다.
      </p>
      <div className="flex justify-end mb-3">
        <button
          onClick={handleAddRow}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mr-2 transition-colors duration-200"
        >
          행 추가
        </button>
        <button
          onClick={handleDeleteRows}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
        >
          선택 행 삭제
        </button>
      </div>
      <GridWrapper
        data={initialData}
        columns={columns}
        rowHeaders={["checkbox"]}
        onGridReady={handleGridReady}
        onGridClick={handleGridClick}
        bodyHeight={500}
      />
    </div>
  );
};

const DraggableColumnsGrid: FC = () => {
  const data = getSampleData(15);
  const columns: ColumnInfo[] = [
    {
      header: "No.",
      name: "rowNumDesc",
      width: 60,
      align: "center",
      renderer: { type: DescendingRowNumRenderer },
    },
    { header: "ID", name: "id", align: "center", width: 80 },
    { header: "이름", name: "name", sortable: true },
    { header: "부서", name: "department", sortable: true },
    { header: "직급", name: "grade", align: "center" },
    { header: "입사일", name: "joinDate", align: "center" },
    { header: "점수", name: "score", align: "right", sortable: true },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">컬럼 순서 변경 (드래그)</h2>
      <p className="mb-4 text-gray-600">
        컬럼 헤더를 마우스로 드래그하여 원하는 위치로 이동시킬 수 있습니다. 행
        번호는 역순으로 표시됩니다.
      </p>
      <style>{`
        .tui-grid-header-area .tui-grid-cell-draggable .tui-grid-cell-content {
          cursor: grab;
        }
        .tui-grid-header-area .tui-grid-cell-draggable .tui-grid-cell-content:active {
          cursor: grabbing;
        }
        .tui-grid-cell[data-column-name="rowNumDesc"] {
          background: #f4f4f5;
          border-right-color: #e0e0e0;
          font-weight: bold;
        }
      `}</style>
      <GridWrapper
        data={data}
        columns={columns}
        columnOptions={{ draggable: true }}
        bodyHeight={500}
      />
    </div>
  );
};

// --- 사이드바 컴포넌트 ---
interface SidebarProps {
  activeView: string;
  setActiveView: React.Dispatch<React.SetStateAction<string>>;
}

const Sidebar: FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const menuItems = [
    { id: "basic", label: "기본 그리드 (행 선택)" },
    { id: "complex", label: "복합 컬럼 그리드" },
    { id: "editable", label: "셀 편집 (다양한 타입)" },
    { id: "masterDetail", label: "마스터-디테일 그리드" },
    { id: "checkboxAndRow", label: "행 추가/삭제 (토글)" },
    { id: "draggable", label: "컬럼 순서 변경 (드래그)" },
  ];

  return (
    <aside className="w-64 bg-white shadow-md p-4 flex-shrink-0">
      <div className="flex items-center mb-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        <h1 className="text-xl font-bold ml-2">TUI Grid 샘플 (TS)</h1>
      </div>
      <nav>
        <ul>
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveView(item.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                  activeView === item.id
                    ? "bg-blue-500 text-white font-bold"
                    : "text-gray-700 hover:bg-blue-100"
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

// --- 메인 App 컴포넌트 ---
const App: FC = () => {
  const [activeView, setActiveView] = useState<string>("basic");

  const renderView = () => {
    switch (activeView) {
      case "basic":
        return <BasicGrid />;
      case "complex":
        return <ComplexColumnsGrid />;
      case "editable":
        return <EditableGrid />;
      case "masterDetail":
        return <MasterDetailGrid />;
      case "checkboxAndRow":
        return <CheckboxAndRowManagementGrid />;
      case "draggable":
        return <DraggableColumnsGrid />;
      default:
        return <BasicGrid />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">{renderView()}</main>
    </div>
  );
};

export default App;
