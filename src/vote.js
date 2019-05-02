const { exec } = require('child_process');
const CHALK = require('chalk');
const VOTER = require('../config/voter.json');
const { CLI_CURRENCY_MAP } = require('../config/constant.json');

const InternalFunctions = {
  convertToMicroUnit: value => value * 1000000,
};

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execShellCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error || stderr);
      }
      resolve(stdout || stderr);
    });
  });
}

module.exports = {
  submitVote: (voteParam) => {
    if (Object.keys(voteParam).length < 4) {
      console.log(CHALK.red("Parameters doesn't match with standard format."));
      return {
        status: 'error',
        message: "Parameters doesn't match with standard format.",
      };
    }
    if (voteParam.denom === undefined) {
      console.log(CHALK.red('"denom" flag is missed in command'));
      return {
        status: 'error',
        message: '"denom" flag is missed in command',
      };
    }
    if (CLI_CURRENCY_MAP[voteParam.denom] === undefined) {
      console.log(CHALK.red(`"${voteParam.denom}" is not listed into Whitelist`));
      return {
        status: 'error',
        message: `"${voteParam.denom}" is not listed into Whitelist`,
      };
    }
    if (voteParam.price === undefined) {
      console.log(CHALK.red('"price" flag is missed in command'));
      return {
        status: 'error',
        message: '"price" flag is missed in command',
      };
    }
    if (typeof (voteParam.price) !== 'number') {
      console.log(CHALK.red('"price" must be a number'));
      return {
        status: 'error',
        message: '"price" must be number',
      };
    }

    if (voteParam.key === undefined) {
      console.log(CHALK.red('"key" flag is missed in command'));
      return {
        status: 'error',
        message: '"key" flag is missed in command',
      };
    }

    if (voteParam.password === undefined) {
      console.log(CHALK.red('"pw" flag is missed in command'));
      return {
        status: 'error',
        message: '"pw" flag is missed in command',
      };
    }
    this.submitVoteAsync(voteParam)
      .then((result) => {
        console.log('Successfully Voted!!');
        console.log(result);
      })
      .catch((err) => {
        console.log(err);
      });
    return {
      status: 'error',
      message: 'Invalid State',
    };
  },
  submitVoteAsync: async (voteParam) => {
    if (Object.keys(voteParam).length < 4) {
      console.log(CHALK.red("Parameters doesn't match with standard format."));
      return {
        status: 'error',
        message: "Parameters doesn't match with standard format.",
      };
    }
    if (voteParam.denom === undefined) {
      console.log(CHALK.red('"denom" flag is missed in command'));
      return {
        status: 'error',
        message: '"denom" flag is missed in command',
      };
    }
    if (CLI_CURRENCY_MAP[voteParam.denom] === undefined) {
      console.log(CHALK.red(`"${voteParam.denom}" is not listed into Whitelist`));
      return {
        status: 'error',
        message: `"${voteParam.denom}" is not listed into Whitelist`,
      };
    }
    if (voteParam.price === undefined) {
      console.log(CHALK.red('"price" flag is missed in command'));
      return {
        status: 'error',
        message: '"price" flag is missed in command',
      };
    }
    if (typeof (voteParam.price) !== 'number') {
      console.log(CHALK.red('"price" must be a number'));
      return {
        status: 'error',
        message: '"price" must be number',
      };
    }

    if (voteParam.key === undefined) {
      console.log(CHALK.red('"key" flag is missed in command'));
      return {
        status: 'error',
        message: '"key" flag is missed in command',
      };
    }

    if (voteParam.password === undefined) {
      console.log(CHALK.red('"pw" flag is missed in command'));
      return {
        status: 'error',
        message: '"pw" flag is missed in command',
      };
    }

    const microPrice = InternalFunctions.convertToMicroUnit(voteParam.price);
    const command = `echo ${voteParam.password} | terracli tx oracle vote --denom "${CLI_CURRENCY_MAP[voteParam.denom]}" --price "${microPrice}" --from ${voteParam.key} --chain-id ${VOTER.CHAIN_ID} -y`;
    const res = await execShellCommand(command);
    return res;
  },
};
