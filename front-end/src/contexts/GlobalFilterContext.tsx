import React, { createContext, useContext, useState } from 'react';

interface GlobalFilterContextType {
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
}

const GlobalFilterContext = createContext<GlobalFilterContextType | undefined>(undefined);

export const GlobalFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  return (
    <GlobalFilterContext.Provider value={{ selectedMonth, selectedYear, setSelectedMonth, setSelectedYear }}>
      {children}
    </GlobalFilterContext.Provider>
  );
};

export const useGlobalFilter = (): GlobalFilterContextType => {
  const ctx = useContext(GlobalFilterContext);
  if (!ctx) throw new Error('useGlobalFilter must be used inside GlobalFilterProvider');
  return ctx;
};
