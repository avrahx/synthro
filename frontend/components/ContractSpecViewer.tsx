"use client";

import React, { useState } from "react";
import { FileCode2, Copy, Check } from "lucide-react";

const contracts: Record<string, string> = {
  "SynthroHyperVault.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IHyperCoreWriter.sol";

/**
 * @title SynthroHyperVault
 * @notice Delta-Neutral Funding Harvester on Hyperliquid L1
 */
contract SynthroHyperVault is ERC4626, Ownable2Step, ReentrancyGuard {
    IHyperCoreWriter public immutable hlCore;
    
    uint256 public highWaterMark;
    uint256 public leaderFeeBps = 1000; // 10%

    constructor(IERC20 asset, IHyperCoreWriter _hlCore) ERC4626(asset) ERC20("Synthro Vault", "sVAULT") Ownable(msg.sender) {
        hlCore = _hlCore;
    }

    /**
     * @dev Mitigates the inflation attack by offsetting decimals.
     */
    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }

    function settlePerformanceFee(uint256 currentNav) external nonReentrant {
        require(currentNav > highWaterMark, "No new high water mark");
        uint256 profit = currentNav - highWaterMark;
        uint256 fee = (profit * leaderFeeBps) / 10000;
        
        uint256 sharesToMint = previewDeposit(fee);
        _mint(owner(), sharesToMint);
        
        highWaterMark = currentNav;
    }

    function checkLeaderCapacity(uint256 depositAssets) public view {
        uint256 leaderBalance = previewRedeem(balanceOf(owner()));
        uint256 reqCapacity = (totalAssets() + depositAssets) * 5 / 100;
        require(leaderBalance >= reqCapacity, "Leader equity < 5% requirement");
    }

    // Vault hooks for Hyperliquid Core
    function dispatchBasisTrade(bytes calldata action) external onlyOwner {
        hlCore.dispatchL1Action(action);
    }
}
`,
  "IERC4626.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "../IERC20.sol";
import {IERC20Metadata} from "../extensions/IERC20Metadata.sol";

interface IERC4626 is IERC20, IERC20Metadata {
    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    
    function asset() external view returns (address assetTokenAddress);
    function totalAssets() external view returns (uint256 totalManagedAssets);
    
    function convertToShares(uint256 assets) external view returns (uint256 shares);
    function convertToAssets(uint256 shares) external view returns (uint256 assets);
    
    function previewDeposit(uint256 assets) external view returns (uint256 shares);
    function previewMint(uint256 shares) external view returns (uint256 assets);
    function previewWithdraw(uint256 assets) external view returns (uint256 shares);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
}
`,
  "IHyperCoreWriter.sol": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHyperCoreWriter {
    /**
     * @notice Dispatches an L1 action to the Hyperliquid sequencer.
     * @param action Payload matching the L1 schema (e.g. order, cancel).
     */
    function dispatchL1Action(bytes calldata action) external;
    
    /**
     * @notice Withdraws USDC from the L1 bridge.
     */
    function withdrawUsdc(uint256 amount, address destination) external;
}
`
};

export const ContractSpecViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState("SynthroHyperVault.sol");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contracts[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass rounded-xl border border-border-subtle flex flex-col h-[500px] overflow-hidden">
      <div className="flex items-center justify-between bg-bg-raised border-b border-border-strong px-4 h-12">
        <div className="flex gap-2">
          {Object.keys(contracts).map(file => (
            <button
              key={file}
              onClick={() => setActiveTab(file)}
              className={`px-3 py-1.5 text-xs font-mono rounded-t-md border-b-2 transition-all ${
                activeTab === file 
                  ? "border-hl-cyan text-hl-cyan bg-bg" 
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <FileCode2 className="w-3 h-3 inline-block mr-1.5 mb-0.5" />
              {file}
            </button>
          ))}
        </div>
        <button 
          onClick={handleCopy}
          className="text-gray-400 hover:text-white transition-colors"
          title="Copy source code"
        >
          {copied ? <Check className="w-4 h-4 text-hl-mint" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      
      <div className="flex-1 bg-bg p-4 overflow-auto">
        <pre className="text-[11px] font-mono leading-relaxed text-gray-300">
          <code>
            {contracts[activeTab].split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 shrink-0 text-gray-600 select-none text-right pr-4">{i + 1}</span>
                <span className="whitespace-pre">{line}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};
