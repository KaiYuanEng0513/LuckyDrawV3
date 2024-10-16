interface Prize {
  name: string;
  probability: number; // Probability as a percentage
}

interface SlotConfigurations {
  /** User configuration for maximum item inside a reel */
  maxReelItems?: number;
  /** User configuration for whether winner should be removed from name list */
  removeWinner?: boolean;
  /** User configuration for element selector which reel items should append to */
  reelContainerSelector: string;
  /** User configuration for callback function that runs before spinning reel */
  onSpinStart?: () => void;
  /** User configuration for callback function that runs after spinning reel */
  onSpinEnd?: () => void;

  /** User configuration for callback function that runs after user updates the name list */
  onNameListChanged?: () => void;
}

/** Class for doing random name pick and animation */
export default class Slot {
  /** List of names to draw from */
  private nameList: string[];

  private prizes: Prize[];

  /** Whether there is a previous winner element displayed in reel */
  // private havePreviousWinner: boolean;

  /** Container that hold the reel items */
  private reelContainer: HTMLElement | null;

  /** Maximum item inside a reel */
  private maxReelItems: NonNullable<SlotConfigurations["maxReelItems"]>;

  /** Whether winner should be removed from name list */
  private shouldRemoveWinner: NonNullable<SlotConfigurations["removeWinner"]>;

  /** Reel animation object instance */
  private reelAnimation?: Animation;

  /** Callback function that runs before spinning reel */
  private onSpinStart?: NonNullable<SlotConfigurations["onSpinStart"]>;

  /** Callback function that runs after spinning reel */
  private onSpinEnd?: NonNullable<SlotConfigurations["onSpinEnd"]>;

  /** Callback function that runs after spinning reel */
  private onNameListChanged?: NonNullable<
    SlotConfigurations["onNameListChanged"]
  >;

  /**
   * Constructor of Slot
   * @param maxReelItems  Maximum item inside a reel
   * @param removeWinner  Whether winner should be removed from name list
   * @param reelContainerSelector  The element ID of reel items to be appended
   * @param onSpinStart  Callback function that runs before spinning reel
   * @param onSpinEnd  Callback function that runs after spinning reel
   * @param onNameListChanged  Callback function that runs when user updates the name list
   * @param prizes  List of prizes available
   */
  constructor({
    maxReelItems = 30,
    removeWinner = true,
    reelContainerSelector,
    onSpinStart,
    onSpinEnd,
    onNameListChanged,
    prizes, // Added prizes to the destructured parameters
  }: SlotConfigurations & { prizes: Prize[] }) {
    this.prizes = prizes; // Use this.prizes to refer to the class property
    console.log("Loaded Prizes: ", this.prizes);
    this.nameList = [];
    // this.havePreviousWinner = false;
    this.reelContainer = document.querySelector(reelContainerSelector);
    this.maxReelItems = maxReelItems;
    this.shouldRemoveWinner = removeWinner;
    this.onSpinStart = onSpinStart;
    this.onSpinEnd = onSpinEnd;
    this.onNameListChanged = onNameListChanged;

    // Create reel animation
    this.reelAnimation = this.reelContainer?.animate(
      [
        { transform: "none", filter: "blur(0)" },
        { filter: "blur(1px)", offset: 0.5 },
        {
          transform: `translateY(-${(this.maxReelItems - 1) * (7.5 * 16)}px)`,
          filter: "blur(0)",
        },
      ],
      {
        duration: this.maxReelItems * 100, // 100ms for 1 item
        easing: "ease-in-out",
        iterations: 1,
      },
    );

    this.reelAnimation?.cancel();
  }

  /**
   * Setter for name list
   * @param names  List of names to draw a winner from
   */
  set names(names: string[]) {
    this.nameList = names;

    const reelItemsToRemove = this.reelContainer?.children
      ? Array.from(this.reelContainer.children)
      : [];

    reelItemsToRemove.forEach((element) => element.remove());

    // this.havePreviousWinner = false;

    if (this.onNameListChanged) {
      this.onNameListChanged();
    }
  }

  /** Getter for name list */
  get names(): string[] {
    return this.nameList;
  }

  /**
   * Setter for shouldRemoveWinner
   * @param removeWinner  Whether the winner should be removed from name list
   */
  set shouldRemoveWinnerFromNameList(removeWinner: boolean) {
    this.shouldRemoveWinner = removeWinner;
  }

  /** Getter for shouldRemoveWinner */
  get shouldRemoveWinnerFromNameList(): boolean {
    return this.shouldRemoveWinner;
  }

  // /**
  //  * Returns a new array where the items are shuffled
  //  * @template T  Type of items inside the array to be shuffled
  //  * @param array  The array to be shuffled
  //  * @returns The shuffled array
  //  */
  // private static shuffleNames<T = unknown>(array: T[]): T[] {
  //   const keys = Object.keys(array) as unknown[] as number[];
  //   const result: T[] = [];
  //   for (let k = 0, n = keys.length; k < array.length && n > 0; k += 1) {
  //     // eslint-disable-next-line no-bitwise
  //     const i = (Math.random() * n) | 0;
  //     const key = keys[i];
  //     result.push(array[key]);
  //     n -= 1;
  //     const tmp = keys[n];
  //     keys[n] = key;
  //     keys[i] = tmp;
  //   }
  //   return result;
  // }

  /**
   * Function for spinning the slot
   * @returns Whether the spin is completed successfully
   */
  public async spin(): Promise<boolean> {
  if (!this.nameList.length) {
    console.error("Name List is empty. Cannot start spinning.");
    return false;
  }

  const totalProbability = this.prizes.reduce(
    (total, prize) => total + prize.probability,
    0
  );

  const randomValue = Math.random() * totalProbability;
  let accumulatedProbability = 0;
  let selectedPrize: Prize | undefined;

  for (const prize of this.prizes) {
    accumulatedProbability += prize.probability;
    if (randomValue < accumulatedProbability) {
      selectedPrize = prize;
      break;
    }
  }

  if (!selectedPrize) {
    console.error("No prize selected. Something went wrong.");
    return false;
  }

  if (this.onSpinStart) {
    this.onSpinStart();
  }

  const { reelContainer, reelAnimation } = this;
  if (!reelContainer || !reelAnimation) {
    return false;
  }

  // Populate the reel with all prizes (including their amounts if needed)
  const fragment = document.createDocumentFragment();

  // Copy the prizes to ensure at least 40 elements in the reel
  const prizeList = [...this.prizes]; // Start with original prize list

  while (prizeList.length < 40) {
    prizeList.push(...this.prizes); // Add prizes until reaching at least 40
  }

  // Trim the list to exactly 40 if it exceeds that
  prizeList.length = 40;

  // Add all prizes to the reel
  prizeList.forEach((prize) => {
    const prizeItem = document.createElement("div");
    prizeItem.innerHTML = `${prize.name}`;
    fragment.appendChild(prizeItem);
  });

  // Append the prize elements to the reel container
  reelContainer.appendChild(fragment);

  // Play the animation
  reelAnimation.play();
  const animationPromise = new Promise((resolve) => {
    reelAnimation.onfinish = resolve;
  });

  await animationPromise;

  // Wait for the spinning to finish, then adjust to land on the selected prize
  await new Promise((resolve) => setTimeout(resolve, 100)); // Short pause before transition

  // Clear the previous reel items
  Array.from(reelContainer.children).forEach((element) => element.remove());

  // Create the final reel item based on the selected prize
  const selectedPrizeElement = document.createElement("div");
  selectedPrizeElement.innerHTML = selectedPrize.name;
  reelContainer.appendChild(selectedPrizeElement);

  console.info('WINNER:', selectedPrize.name);

  // Call the onSpinEnd callback if provided
  if (this.onSpinEnd) {
    this.onSpinEnd();
  }

  return true;
}


  
}
