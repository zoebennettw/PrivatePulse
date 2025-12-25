import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  const deployedPrivatePulse = await deploy("PrivatePulse", {
    from: deployer,
    log: true,
  });

  log(`PrivatePulse contract: ${deployedPrivatePulse.address}`);
};

export default func;
func.id = "deploy_privatePulse";
func.tags = ["PrivatePulse"];
