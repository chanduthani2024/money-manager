import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

const TOUR_KEY = 'culture_tour_done';

const steps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to Culture!',
    content: (
      <div className="space-y-2 text-sm text-left">
        <p>This quick tour will walk you through setting up your personal finance tracker.</p>
        <p className="font-medium text-indigo-700">Let's get started in under 2 minutes.</p>
      </div>
    ),
  },
  {
    target: '[data-tour="budget"]',
    placement: 'bottom',
    disableBeacon: true,
    title: '1. Set Your Opening Balance',
    content: (
      <div className="text-sm text-left space-y-2">
        <p>Start here in the <strong>Budget</strong> page.</p>
        <ul className="list-disc pl-4 space-y-1 text-gray-600">
          <li>Select the <strong>starting month &amp; year</strong></li>
          <li>Enter your <strong>salary / opening balance</strong></li>
          <li>Import your <strong>HDFC bank statement PDF</strong> (download from HDFC app)</li>
        </ul>
        <p className="text-xs text-gray-500">This sets the baseline for your budget tracking.</p>
      </div>
    ),
  },
  {
    target: '[data-tour="settings"]',
    placement: 'bottom',
    disableBeacon: true,
    title: '2. Configure Settings',
    content: (
      <div className="text-sm text-left space-y-2">
        <p>Go to <strong>Settings</strong> to configure your bank account.</p>
        <ul className="list-disc pl-4 space-y-1 text-gray-600">
          <li><strong>Customer ID</strong> — used to fetch your live balance</li>
          <li><strong>PDF Password</strong> — the password to open your HDFC statement (usually your date of birth)</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="categories"]',
    placement: 'bottom',
    disableBeacon: true,
    title: '3. Set Up Categories & Reasons',
    content: (
      <div className="text-sm text-left space-y-2">
        <p>In <strong>Categories</strong>, organise your spending:</p>
        <ul className="list-disc pl-4 space-y-1 text-gray-600">
          <li><strong>Wants</strong> — dining, entertainment, shopping</li>
          <li><strong>Needs</strong> — rent, groceries, utilities</li>
          <li><strong>Investments</strong> — SIP, stocks, savings</li>
        </ul>
        <p className="text-xs text-gray-500">Under each category, add specific <strong>expense reasons</strong> (e.g. "Zomato", "Rent", "SIP").</p>
      </div>
    ),
  },
  {
    target: '[data-tour="transactions"]',
    placement: 'bottom',
    disableBeacon: true,
    title: '4. Classify Transactions',
    content: (
      <div className="text-sm text-left space-y-2">
        <p>In <strong>Transactions</strong>, your imported bank transactions appear under <em>Needs Categorization</em>.</p>
        <ul className="list-disc pl-4 space-y-1 text-gray-600">
          <li>Click <strong>Assign Category</strong> on each transaction</li>
          <li>Pick the matching expense reason</li>
        </ul>
        <p className="text-xs text-gray-500">Once classified, transactions are linked to your budget allocations.</p>
      </div>
    ),
  },
  {
    target: '[data-tour="budget"]',
    placement: 'bottom',
    disableBeacon: true,
    title: '5. Allocate Your Budget',
    content: (
      <div className="text-sm text-left space-y-2">
        <p>Back in <strong>Budget</strong>, allocate spending limits per reason.</p>
        <ul className="list-disc pl-4 space-y-1 text-gray-600">
          <li>Set how much you plan to spend on each reason</li>
          <li>As you classify transactions, the <strong>spent amount</strong> updates automatically</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="dashboard"]',
    placement: 'bottom',
    disableBeacon: true,
    title: '6. Track on the Dashboard',
    content: (
      <div className="text-sm text-left space-y-2">
        <p>The <strong>Dashboard</strong> gives you a full picture:</p>
        <ul className="list-disc pl-4 space-y-1 text-gray-600">
          <li>Budget vs actual spending</li>
          <li>Spending breakdown by category</li>
          <li>Remaining balance for the month</li>
        </ul>
        <p className="font-medium text-green-700">You're all set! Happy tracking.</p>
      </div>
    ),
  },
];

interface TourGuideProps {
  run: boolean;
  onFinish: () => void;
}

export const TourGuide: React.FC<TourGuideProps> = ({ run, onFinish }) => {
  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_KEY, 'true');
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: '#6366f1',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          fontSize: '14px',
          maxWidth: '360px',
        },
        tooltipTitle: {
          fontSize: '15px',
          fontWeight: 600,
        },
        buttonNext: {
          borderRadius: '8px',
          padding: '8px 16px',
        },
        buttonBack: {
          borderRadius: '8px',
          padding: '8px 16px',
        },
        buttonSkip: {
          color: '#9ca3af',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
};

export const TOUR_KEY_EXPORT = TOUR_KEY;
